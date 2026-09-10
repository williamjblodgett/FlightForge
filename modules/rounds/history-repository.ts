import { getD1Database } from "@/db/runtime";
import { ensurePersistedUserId } from "@/modules/auth/account-repository";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { ActiveRound, RoundCorrection, PersistedHoleScore } from "./round-repository";
import type { RoundContext } from "./round-context";

export type RoundDetail = { round: ActiveRound; context: RoundContext; status: string; completedAt: string | null; totalScore: number };

export async function getRoundForUser(user: AuthenticatedUser, id: string): Promise<RoundDetail | null> {
  const uid = await ensurePersistedUserId(user);
  const db = getD1Database();
  const row = await db.prepare(`SELECT r.id, COALESCE(r.session_key,r.event_id) AS eventId, r.course_id AS courseId, r.layout_id AS layoutId,
    r.context_json AS contextJson, r.status, r.completed_at AS completedAt, r.version, r.updated_at AS updatedAt,
    e.title, e.venue_name AS venueName, e.hole_count AS holeCount, s.id AS scorecardId
    FROM rounds r JOIN round_players p ON p.round_id=r.id AND p.user_id=? JOIN scorecards s ON s.round_player_id=p.id
    LEFT JOIN events e ON e.id=r.event_id WHERE r.id=? AND r.created_by=? LIMIT 1`).bind(uid,id,uid).first<{
      id: string; eventId: string; courseId: string; layoutId: string | null; contextJson: string | null;
      status: string; completedAt: string | null; version: number; updatedAt: string; title: string | null;
      venueName: string | null; holeCount: number | null; scorecardId: string;
    }>();
  if (!row) return null;
  const scores = await db.prepare("SELECT hole_number AS holeNumber, strokes, penalties, updated_at AS updatedAt FROM hole_scores WHERE scorecard_id=? ORDER BY hole_number").bind(row.scorecardId).all<PersistedHoleScore>();
  const corrections = await db.prepare(`SELECT id, hole_number AS holeNumber, from_strokes AS fromStrokes, to_strokes AS toStrokes,
    from_penalties AS fromPenalties, to_penalties AS toPenalties, created_at AS createdAt FROM round_score_audit_events WHERE scorecard_id=? ORDER BY created_at DESC LIMIT 100`).bind(row.scorecardId).all<RoundCorrection>();
  const context: RoundContext = row.contextJson ? JSON.parse(row.contextJson) as RoundContext : {
    schemaVersion: 1, id: row.eventId, kind: "EVENT", courseId: row.courseId, layoutId: row.layoutId,
    title: row.title ?? "Recorded round", venueName: row.venueName ?? "Course", holeCount: row.holeCount ?? scores.results.length,
    pars: Array(row.holeCount ?? scores.results.length).fill(null), parSource: "UNKNOWN",
  };
  return { context, status: row.status, completedAt: row.completedAt,
    totalScore: scores.results.reduce((n,s)=>n+s.strokes+s.penalties,0),
    round: { id: row.id, eventId: row.eventId, courseId: row.courseId, layoutId: row.layoutId, scorecardId: row.scorecardId,
      version: row.version, lastSyncedAt: row.updatedAt, context, holeScores: scores.results, corrections: corrections.results } };
}

export async function listRoundHistory(user: AuthenticatedUser, page = 1) {
  const uid = await ensurePersistedUserId(user);
  const rows = await getD1Database().prepare(`SELECT r.id, r.completed_at AS completedAt,
    COALESCE(json_extract(r.context_json,'$.venueName'),e.venue_name,'Recorded course') AS courseName,
    COALESCE(json_extract(r.context_json,'$.title'),e.title,'Recorded round') AS title,
    COALESCE(json_extract(r.context_json,'$.holeCount'),e.hole_count) AS holeCount, s.total_score AS totalScore
    FROM rounds r JOIN round_players p ON p.round_id=r.id AND p.user_id=? JOIN scorecards s ON s.round_player_id=p.id
    LEFT JOIN events e ON e.id=r.event_id WHERE r.created_by=? AND r.status='COMPLETED'
    ORDER BY r.completed_at DESC,r.id DESC LIMIT 26 OFFSET ?`).bind(uid,uid,(page-1)*25).all<{
      id: string; completedAt: string; courseName: string; title: string; holeCount: number; totalScore: number;
    }>();
  return { items: rows.results.slice(0,25), hasNext: rows.results.length > 25 };
}

export async function correctPersonalRound(user: AuthenticatedUser, id: string, input: { holeNumber: number; strokes: number; penalties: number; reason: string; expectedVersion: number; clientMutationId: string }) {
  const detail = await getRoundForUser(user,id);
  if (!detail || detail.status !== "COMPLETED" || detail.context.kind !== "PERSONAL") return { status: 403 as const };
  const prior = detail.round.holeScores.find(h=>h.holeNumber===input.holeNumber);
  if (!prior) return { status: 422 as const };
  const db = getD1Database();
  const readDuplicate=()=>db.prepare("SELECT hole_number AS holeNumber,to_strokes AS strokes,to_penalties AS penalties FROM round_score_audit_events WHERE round_id=? AND client_mutation_id=?").bind(id,input.clientMutationId).first<{holeNumber:number;strokes:number;penalties:number}>();
  const matches=(saved:{holeNumber:number;strokes:number;penalties:number})=>saved.holeNumber===input.holeNumber&&saved.strokes===input.strokes&&saved.penalties===input.penalties;
  const duplicate=await readDuplicate();
  if(duplicate)return {status:matches(duplicate)?200 as const:409 as const};
  if (detail.round.version !== input.expectedVersion) return { status: 409 as const };
  const uid=await ensurePersistedUserId(user); const now=new Date().toISOString();
  const attemptId=crypto.randomUUID();
  const result=await db.batch([
    db.prepare("UPDATE rounds SET version=version+1,updated_at=?,last_mutation_id=? WHERE id=? AND created_by=? AND status='COMPLETED' AND version=?").bind(now,attemptId,id,uid,input.expectedVersion),
    db.prepare(`UPDATE hole_scores SET strokes=?,penalties=?,updated_at=?,version=version+1 WHERE scorecard_id=? AND hole_number=? AND EXISTS(SELECT 1 FROM rounds WHERE id=? AND last_mutation_id=?)`).bind(input.strokes,input.penalties,now,detail.round.scorecardId,input.holeNumber,id,attemptId),
    db.prepare(`INSERT INTO round_score_audit_events(id,round_id,scorecard_id,hole_number,actor_user_id,from_strokes,to_strokes,from_penalties,to_penalties,client_mutation_id,created_at)
      SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM rounds WHERE id=? AND last_mutation_id=?)`).bind(crypto.randomUUID(),id,detail.round.scorecardId,input.holeNumber,uid,prior.strokes,input.strokes,prior.penalties,input.penalties,input.clientMutationId,now,id,attemptId),
    db.prepare(`UPDATE scorecards SET total_score=(SELECT SUM(strokes+penalties) FROM hole_scores WHERE scorecard_id=?),updated_at=?,version=version+1 WHERE id=? AND EXISTS(SELECT 1 FROM rounds WHERE id=? AND last_mutation_id=?)`).bind(detail.round.scorecardId,now,detail.round.scorecardId,id,attemptId),
    db.prepare(`INSERT INTO audit_logs(id,actor_user_id,action,resource_type,resource_id,reason,created_at) SELECT ?,?,'ROUND_CORRECTED','round',?,?,? WHERE EXISTS(SELECT 1 FROM rounds WHERE id=? AND last_mutation_id=?)`).bind(crypto.randomUUID(),uid,id,input.reason,now,id,attemptId),
  ]);
  if(!result[0]?.meta.changes){const applied=await readDuplicate();return {status:applied&&matches(applied)?200 as const:409 as const};}
  return {status:200 as const};
}
