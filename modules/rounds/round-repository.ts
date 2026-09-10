import { getD1Database } from "@/db/runtime";
import { ensurePersistedUserId } from "@/modules/auth/account-repository";
import type { AuthenticatedUser } from "@/modules/auth/types";
import { ensureEventSchema } from "@/modules/events/event-repository";
import { snapshotRoundContext, type RoundContext, type RoundInput } from "./round-context";

export type PersistedHoleScore = { holeNumber: number; strokes: number; penalties: number; updatedAt: string };
export type RoundCorrection = {
  id: string;
  holeNumber: number;
  fromStrokes: number | null;
  toStrokes: number;
  fromPenalties: number | null;
  toPenalties: number;
  createdAt: string;
};
export type ActiveRound = {
  id: string;
  eventId: string;
  courseId: string;
  layoutId: string | null;
  scorecardId: string;
  holeScores: PersistedHoleScore[];
  corrections: RoundCorrection[];
  version: number;
  lastSyncedAt: string;
  context?: RoundContext;
};

export type CompletedRound = {
  id: string;
  eventId: string;
  courseId: string;
  status: "COMPLETED";
  completedAt: string;
  totalScore: number;
  version: number;
};

export type ActiveRoundSummary = {
  id: string;
  eventId: string;
  courseId: string;
  eventTitle: string;
  venueName: string;
  holeCount: number;
  completedHoles: number;
  totalScore: number;
  updatedAt: string;
};

export class RoundConflictError extends Error {
  constructor(public readonly round: ActiveRound) {
    super("This round changed on another device.");
    this.name = "RoundConflictError";
  }
}

export class RoundIncompleteError extends Error {
  constructor() {
    super("Enter a score for every hole before finishing the round.");
    this.name = "RoundIncompleteError";
  }
}

export class RoundUnavailableError extends Error {
  constructor() {
    super("That active round is no longer available.");
    this.name = "RoundUnavailableError";
  }
}

export async function getOrCreateActiveRound(user: AuthenticatedUser, event: RoundInput): Promise<ActiveRound> {
  await ensureRoundSchema();
  const userId = await ensurePersistedUserId(user);
  const database = getD1Database();
  let row = await database.prepare(activeRoundSelect).bind(userId, event.id).first<ActiveRoundRow>();
  if (!row) {
    const context = await snapshotRoundContext(event);
    const roundId = crypto.randomUUID();
    const playerId = crypto.randomUUID();
    const scorecardId = crypto.randomUUID();
    const now = new Date().toISOString();
    await database.batch([
      database.prepare(
        `INSERT OR IGNORE INTO rounds
          (id, course_id, layout_id, event_id, session_key, context_json, created_by, status, scoring_format, started_at,
           client_sync_id, created_at, updated_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'IN_PROGRESS', 'STROKE_PLAY', ?, ?, ?, ?, 1)`,
      ).bind(roundId, event.courseId, event.layoutId, context.kind === "PERSONAL" ? null : event.id, context.kind === "PERSONAL" ? event.id : null, JSON.stringify(context), userId, now, `active:${userId}:${event.id}:${roundId}`, now, now),
      database.prepare(
        `INSERT OR IGNORE INTO round_players
          (id, round_id, user_id, created_at, updated_at) SELECT ?, r.id, ?, ?, ? FROM rounds r WHERE r.created_by = ? AND COALESCE(r.session_key, r.event_id) = ? AND r.status = 'IN_PROGRESS' AND NOT EXISTS (SELECT 1 FROM round_players p WHERE p.round_id = r.id AND p.user_id = ?)`,
      ).bind(playerId, userId, now, now, userId, event.id, userId),
      database.prepare(
        `INSERT OR IGNORE INTO scorecards
          (id, round_id, round_player_id, verification_type, created_at, updated_at, version)
         SELECT ?, p.round_id, p.id, 'APP_RECORDED', ?, ?, 1 FROM round_players p JOIN rounds r ON r.id = p.round_id WHERE r.created_by = ? AND COALESCE(r.session_key, r.event_id) = ? AND r.status = 'IN_PROGRESS' AND p.user_id = ? AND NOT EXISTS (SELECT 1 FROM scorecards s WHERE s.round_player_id = p.id)`,
      ).bind(scorecardId, now, now, userId, event.id, userId),
    ]);
    row = await database.prepare(activeRoundSelect).bind(userId, event.id).first<ActiveRoundRow>();
  }
  if (!row) throw new Error("The active round could not be created.");
  if(!row.contextJson){const context=await snapshotRoundContext(event);await database.prepare("UPDATE rounds SET context_json = ? WHERE id = ? AND context_json IS NULL").bind(JSON.stringify(context),row.id).run();row=await database.prepare(activeRoundSelect).bind(userId,event.id).first<ActiveRoundRow>();if(!row)throw new RoundUnavailableError();}
  return hydrateRound(row);
}

async function ensureRoundSchema() {
  // Schema is owned by versioned deployment migrations, never request-time DDL.
  await getD1Database().prepare("SELECT session_key, context_json FROM rounds LIMIT 0").all();
}

export async function listActiveRoundSummaries(user: AuthenticatedUser): Promise<ActiveRoundSummary[]> {
  await Promise.all([ensureRoundSchema(), ensureEventSchema()]);
  const userId = await ensurePersistedUserId(user);
  const result = await getD1Database().prepare(
    `SELECT r.id, COALESCE(r.session_key, r.event_id) AS eventId, r.course_id AS courseId, COALESCE(json_extract(r.context_json, '$.title'), e.title) AS eventTitle,
      COALESCE(json_extract(r.context_json, '$.venueName'), e.venue_name) AS venueName, COALESCE(json_extract(r.context_json, '$.holeCount'), e.hole_count) AS holeCount, r.updated_at AS updatedAt,
      COUNT(hs.id) AS completedHoles, COALESCE(SUM(hs.strokes + hs.penalties), 0) AS totalScore
     FROM rounds r
     LEFT JOIN events e ON e.id = r.event_id
     JOIN round_players rp ON rp.round_id = r.id AND rp.user_id = ?
     JOIN scorecards s ON s.round_player_id = rp.id
     LEFT JOIN hole_scores hs ON hs.scorecard_id = s.id
     WHERE r.created_by = ? AND r.status = 'IN_PROGRESS'
     GROUP BY r.id, r.event_id, r.course_id, e.title, e.venue_name, e.hole_count, r.updated_at
     ORDER BY r.updated_at DESC LIMIT 8`,
  ).bind(userId, userId).all<ActiveRoundSummary>();
  return result.results;
}

export async function saveHoleScore(user: AuthenticatedUser, event: RoundInput, input: {
  roundId: string;
  holeNumber: number;
  strokes: number;
  penalties: number;
  clientMutationId: string;
  expectedVersion?: number;
}): Promise<ActiveRound> {
  const userId = await ensurePersistedUserId(user);
  const database = getD1Database();
  const readExact = async () => {
    const row = await database.prepare(activeRoundSelect.replace(" LIMIT 1", " AND r.id = ? LIMIT 1")).bind(userId,event.id,input.roundId).first<ActiveRoundRow>();
    if(!row)throw new RoundUnavailableError();
    return hydrateRound(row);
  };
  const round = await readExact();
  if (input.holeNumber < 1 || input.holeNumber > (round.context?.holeCount ?? event.holeCount)) throw new Error("That hole is not part of this round layout.");
  const readDuplicate=()=>database.prepare("SELECT hole_number AS holeNumber,to_strokes AS strokes,to_penalties AS penalties FROM round_score_audit_events WHERE client_mutation_id=? AND round_id=? LIMIT 1").bind(input.clientMutationId,round.id).first<{holeNumber:number;strokes:number;penalties:number}>();
  const matches=(saved:{holeNumber:number;strokes:number;penalties:number})=>saved.holeNumber===input.holeNumber&&saved.strokes===input.strokes&&saved.penalties===input.penalties;
  const duplicate=await readDuplicate();
  if(duplicate){if(!matches(duplicate))throw new RoundConflictError(round);return readExact();}
  const expectedVersion = input.expectedVersion ?? round.version;
  if (round.version !== expectedVersion) throw new RoundConflictError(round);
  const prior = await database.prepare(
    "SELECT strokes, penalties FROM hole_scores WHERE scorecard_id = ? AND hole_number = ? LIMIT 1",
  ).bind(round.scorecardId, input.holeNumber).first<{ strokes: number; penalties: number }>();
  const now = new Date().toISOString();
  const attemptId = crypto.randomUUID();
  const results = await database.batch([
    database.prepare(
      `UPDATE rounds SET updated_at = ?, version = version + 1, last_mutation_id = ?
       WHERE id = ? AND version = ? AND status = 'IN_PROGRESS' AND created_by = ?`,
    ).bind(now, attemptId, round.id, expectedVersion, userId),
    database.prepare(
      `INSERT INTO hole_scores
        (id, scorecard_id, hole_number, strokes, penalties, completed_at, client_mutation_id, created_at, updated_at, version)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 1
       WHERE EXISTS (SELECT 1 FROM rounds WHERE id = ? AND last_mutation_id = ?)
       ON CONFLICT(scorecard_id, hole_number) DO UPDATE SET
         strokes = excluded.strokes, penalties = excluded.penalties, completed_at = excluded.completed_at,
         client_mutation_id = excluded.client_mutation_id, updated_at = excluded.updated_at, version = hole_scores.version + 1`,
    ).bind(crypto.randomUUID(), round.scorecardId, input.holeNumber, input.strokes, input.penalties, now, input.clientMutationId, now, now, round.id, attemptId),
    database.prepare(
      `INSERT INTO round_score_audit_events
        (id, round_id, scorecard_id, hole_number, actor_user_id, from_strokes, to_strokes,
         from_penalties, to_penalties, client_mutation_id, created_at)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
       WHERE EXISTS (SELECT 1 FROM rounds WHERE id = ? AND last_mutation_id = ?)`,
    ).bind(crypto.randomUUID(), round.id, round.scorecardId, input.holeNumber, userId,
      prior?.strokes ?? null, input.strokes, prior?.penalties ?? null, input.penalties, input.clientMutationId, now, round.id, attemptId),
    database.prepare(
      `UPDATE scorecards SET total_score = (SELECT SUM(strokes + penalties) FROM hole_scores WHERE scorecard_id = ?),
       updated_at = ?, version = version + 1 WHERE id = ?
       AND EXISTS (SELECT 1 FROM rounds WHERE id = ? AND last_mutation_id = ?)`,
    ).bind(round.scorecardId, now, round.scorecardId, round.id, attemptId),
  ]);
  if (!results[0]?.meta.changes) { const applied=await readDuplicate(); if(applied&&matches(applied))return readExact(); throw new RoundConflictError(await readExact()); }
  return readExact();
}

export async function completeActiveRound(user: AuthenticatedUser, event: RoundInput, input: {
  roundId: string;
  clientMutationId: string;
  expectedVersion: number;
}): Promise<CompletedRound> {
  await ensureRoundSchema();
  const userId = await ensurePersistedUserId(user);
  const database = getD1Database();
  const readCompletionRow = () => database.prepare(
    `SELECT r.id, COALESCE(r.session_key, r.event_id) AS eventId, r.course_id AS courseId, r.layout_id AS layoutId,
      r.status, r.completed_at AS completedAt, r.last_mutation_id AS lastMutationId,
      r.version, r.context_json AS contextJson, r.updated_at AS updatedAt, s.id AS scorecardId
     FROM rounds r
     JOIN round_players rp ON rp.round_id = r.id AND rp.user_id = ?
     JOIN scorecards s ON s.round_player_id = rp.id
     WHERE r.id = ? AND COALESCE(r.session_key, r.event_id) = ? AND r.created_by = ? LIMIT 1`,
  ).bind(userId, input.roundId, event.id, userId).first<CompletionRoundRow>();
  const row=await readCompletionRow();
  if (!row) throw new RoundUnavailableError();
  if (row.status === "COMPLETED" && row.completedAt) {
    return completedRoundFromRow(row, await scorecardTotal(row.scorecardId));
  }
  if (row.status !== "IN_PROGRESS") throw new RoundUnavailableError();
  if (row.version !== input.expectedVersion) throw new RoundConflictError(await hydrateRound(row));

  const expectedHoles = row.contextJson ? (JSON.parse(row.contextJson) as RoundContext).holeCount : event.holeCount;
  const scoreState = await database.prepare(
    `SELECT COUNT(*) AS scoreCount, MIN(hole_number) AS firstHole, MAX(hole_number) AS lastHole,
      COALESCE(SUM(strokes + penalties), 0) AS totalScore
     FROM hole_scores WHERE scorecard_id = ? AND hole_number BETWEEN 1 AND ?`,
  ).bind(row.scorecardId, expectedHoles).first<{
    scoreCount: number;
    firstHole: number | null;
    lastHole: number | null;
    totalScore: number;
  }>();
  if (!scoreState || Number(scoreState.scoreCount) !== expectedHoles
    || Number(scoreState.firstHole) !== 1 || Number(scoreState.lastHole) !== expectedHoles) {
    throw new RoundIncompleteError();
  }

  const completedAt = new Date().toISOString();
  const attemptId=crypto.randomUUID();
  const result = await database.batch([
    database.prepare(
      `UPDATE rounds SET status = 'COMPLETED', completed_at = ?, updated_at = ?,
        last_mutation_id = ?, version = version + 1
       WHERE id = ? AND created_by = ? AND status = 'IN_PROGRESS' AND version = ?`,
    ).bind(completedAt, completedAt, attemptId, row.id, userId, input.expectedVersion),
    database.prepare(
      `INSERT INTO audit_logs
        (id, actor_user_id, action, resource_type, resource_id, reason, created_at)
       SELECT ?, ?, 'ROUND_COMPLETED', 'round', ?, 'Player confirmed the completed scorecard.', ?
       WHERE EXISTS (SELECT 1 FROM rounds WHERE id = ? AND status = 'COMPLETED' AND last_mutation_id = ?)`,
    ).bind(crypto.randomUUID(), userId, row.id, completedAt, row.id, attemptId),
  ]);
  if (!result[0]?.meta.changes) {
    const current=await readCompletionRow();
    if(current?.status==="COMPLETED"&&current.completedAt)return completedRoundFromRow(current,await scorecardTotal(current.scorecardId));
    if (current?.status==="IN_PROGRESS") throw new RoundConflictError(await hydrateRound(current));
    throw new RoundUnavailableError();
  }
  return {
    id: row.id,
    eventId: event.id,
    courseId: row.courseId,
    status: "COMPLETED",
    completedAt,
    totalScore: Number(scoreState.totalScore),
    version: input.expectedVersion + 1,
  };
}

type ActiveRoundRow = {
  id: string; eventId: string; courseId: string; layoutId: string | null;
  scorecardId: string; version: number; updatedAt: string; contextJson?: string | null;
};

type CompletionRoundRow = ActiveRoundRow & {
  status: string;
  completedAt: string | null;
  lastMutationId: string | null;
};

const activeRoundSelect = `SELECT r.id, COALESCE(r.session_key, r.event_id) AS eventId, r.course_id AS courseId,
  r.layout_id AS layoutId, r.context_json AS contextJson, s.id AS scorecardId, r.version, r.updated_at AS updatedAt
  FROM rounds r JOIN round_players rp ON rp.round_id = r.id JOIN scorecards s ON s.round_player_id = rp.id
  WHERE r.created_by = ? AND rp.user_id = r.created_by AND COALESCE(r.session_key, r.event_id) = ? AND r.status = 'IN_PROGRESS' LIMIT 1`;

async function hydrateRound(row: ActiveRoundRow): Promise<ActiveRound> {
  const database = getD1Database();
  const [scoreResult, correctionResult] = await database.batch([
    database.prepare(
      `SELECT hole_number AS holeNumber, strokes, penalties, updated_at AS updatedAt
       FROM hole_scores WHERE scorecard_id = ? ORDER BY hole_number`,
    ).bind(row.scorecardId),
    database.prepare(
      `SELECT id, hole_number AS holeNumber, from_strokes AS fromStrokes, to_strokes AS toStrokes,
        from_penalties AS fromPenalties, to_penalties AS toPenalties, created_at AS createdAt
       FROM round_score_audit_events WHERE scorecard_id = ? ORDER BY created_at DESC LIMIT 100`,
    ).bind(row.scorecardId),
  ]);
  return {
    id: row.id, eventId: row.eventId, courseId: row.courseId, layoutId: row.layoutId,
    scorecardId: row.scorecardId,
    holeScores: scoreResult.results as unknown as PersistedHoleScore[],
    corrections: correctionResult.results as unknown as RoundCorrection[],
    version: row.version,
    lastSyncedAt: row.updatedAt,
    context: row.contextJson ? JSON.parse(row.contextJson) as RoundContext : undefined,
  };
}

async function scorecardTotal(scorecardId: string): Promise<number> {
  const row = await getD1Database().prepare(
    "SELECT COALESCE(SUM(strokes + penalties), 0) AS totalScore FROM hole_scores WHERE scorecard_id = ?",
  ).bind(scorecardId).first<{ totalScore: number }>();
  return Number(row?.totalScore ?? 0);
}

function completedRoundFromRow(row: CompletionRoundRow, totalScore: number): CompletedRound {
  return {
    id: row.id,
    eventId: row.eventId,
    courseId: row.courseId,
    status: "COMPLETED",
    completedAt: row.completedAt!,
    totalScore,
    version: row.version,
  };
}
