import { getD1Database } from "@/db/runtime";
import { ensurePersistedUserId } from "@/modules/auth/account-repository";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { EventRecord } from "@/modules/events/types";

export type PersistedHoleScore = { holeNumber: number; strokes: number; penalties: number; updatedAt: string };
export type ActiveRound = {
  id: string;
  eventId: string;
  courseId: string;
  layoutId: string | null;
  scorecardId: string;
  holeScores: PersistedHoleScore[];
  version: number;
  lastSyncedAt: string;
};

export async function getOrCreateActiveRound(user: AuthenticatedUser, event: EventRecord): Promise<ActiveRound> {
  await ensureRoundSchema();
  const userId = await ensurePersistedUserId(user);
  const database = getD1Database();
  let row = await database.prepare(activeRoundSelect).bind(userId, event.id).first<ActiveRoundRow>();
  if (!row) {
    const roundId = crypto.randomUUID();
    const playerId = crypto.randomUUID();
    const scorecardId = crypto.randomUUID();
    const now = new Date().toISOString();
    await database.batch([
      database.prepare(
        `INSERT OR IGNORE INTO rounds
          (id, course_id, layout_id, event_id, created_by, status, scoring_format, started_at,
           client_sync_id, created_at, updated_at, version)
         VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS', 'STROKE_PLAY', ?, ?, ?, ?, 1)`,
      ).bind(roundId, event.courseId, event.layoutId, event.id, userId, now, `active:${userId}:${event.id}`, now, now),
      database.prepare(
        `INSERT OR IGNORE INTO round_players
          (id, round_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      ).bind(playerId, roundId, userId, now, now),
      database.prepare(
        `INSERT OR IGNORE INTO scorecards
          (id, round_id, round_player_id, verification_type, created_at, updated_at, version)
         VALUES (?, ?, ?, 'APP_RECORDED', ?, ?, 1)`,
      ).bind(scorecardId, roundId, playerId, now, now),
    ]);
    row = await database.prepare(activeRoundSelect).bind(userId, event.id).first<ActiveRoundRow>();
  }
  if (!row) throw new Error("The active round could not be created.");
  return hydrateRound(row);
}

let roundSchemaInitialization: Promise<void> | null = null;
async function ensureRoundSchema() {
  if (!roundSchemaInitialization) roundSchemaInitialization = initializeRoundSchema().catch((error) => { roundSchemaInitialization = null; throw error; });
  await roundSchemaInitialization;
}
async function initializeRoundSchema() {
  const database = getD1Database();
  const columns = await database.prepare("PRAGMA table_info(rounds)").all<{ name: string }>();
  if (!columns.results.some((column) => column.name === "event_id")) await database.prepare("ALTER TABLE rounds ADD COLUMN event_id TEXT").run();
  await database.batch([
    database.prepare("CREATE UNIQUE INDEX IF NOT EXISTS rounds_user_event_active_unique ON rounds(created_by, event_id) WHERE status = 'IN_PROGRESS'"),
    database.prepare("CREATE UNIQUE INDEX IF NOT EXISTS hole_scores_scorecard_hole_unique ON hole_scores(scorecard_id, hole_number)"),
    database.prepare(`CREATE TABLE IF NOT EXISTS round_score_audit_events (
      id TEXT PRIMARY KEY, round_id TEXT NOT NULL, scorecard_id TEXT NOT NULL, hole_number INTEGER NOT NULL,
      actor_user_id TEXT NOT NULL, from_strokes INTEGER, to_strokes INTEGER NOT NULL,
      from_penalties INTEGER, to_penalties INTEGER NOT NULL, client_mutation_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
    database.prepare("CREATE UNIQUE INDEX IF NOT EXISTS round_score_audit_mutation_unique ON round_score_audit_events(client_mutation_id)"),
  ]);
}

export async function saveHoleScore(user: AuthenticatedUser, event: EventRecord, input: {
  holeNumber: number;
  strokes: number;
  penalties: number;
  clientMutationId: string;
}): Promise<ActiveRound> {
  if (input.holeNumber < 1 || input.holeNumber > event.holeCount) throw new Error("That hole is not part of this event layout.");
  const round = await getOrCreateActiveRound(user, event);
  const userId = await ensurePersistedUserId(user);
  const database = getD1Database();
  const duplicate = await database.prepare(
    "SELECT id FROM round_score_audit_events WHERE client_mutation_id = ? LIMIT 1",
  ).bind(input.clientMutationId).first();
  if (duplicate) return getOrCreateActiveRound(user, event);
  const prior = await database.prepare(
    "SELECT strokes, penalties FROM hole_scores WHERE scorecard_id = ? AND hole_number = ? LIMIT 1",
  ).bind(round.scorecardId, input.holeNumber).first<{ strokes: number; penalties: number }>();
  const now = new Date().toISOString();
  await database.batch([
    database.prepare(
      `INSERT INTO hole_scores
        (id, scorecard_id, hole_number, strokes, penalties, completed_at, client_mutation_id, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT(scorecard_id, hole_number) DO UPDATE SET
         strokes = excluded.strokes, penalties = excluded.penalties, completed_at = excluded.completed_at,
         client_mutation_id = excluded.client_mutation_id, updated_at = excluded.updated_at, version = hole_scores.version + 1`,
    ).bind(crypto.randomUUID(), round.scorecardId, input.holeNumber, input.strokes, input.penalties, now, input.clientMutationId, now, now),
    database.prepare(
      `INSERT INTO round_score_audit_events
        (id, round_id, scorecard_id, hole_number, actor_user_id, from_strokes, to_strokes,
         from_penalties, to_penalties, client_mutation_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(crypto.randomUUID(), round.id, round.scorecardId, input.holeNumber, userId,
      prior?.strokes ?? null, input.strokes, prior?.penalties ?? null, input.penalties, input.clientMutationId, now),
    database.prepare(
      `UPDATE scorecards SET total_score = (SELECT SUM(strokes + penalties) FROM hole_scores WHERE scorecard_id = ?),
       updated_at = ?, version = version + 1 WHERE id = ?`,
    ).bind(round.scorecardId, now, round.scorecardId),
    database.prepare("UPDATE rounds SET updated_at = ?, version = version + 1 WHERE id = ?").bind(now, round.id),
  ]);
  return getOrCreateActiveRound(user, event);
}

type ActiveRoundRow = {
  id: string; eventId: string; courseId: string; layoutId: string | null;
  scorecardId: string; version: number; updatedAt: string;
};

const activeRoundSelect = `SELECT r.id, r.event_id AS eventId, r.course_id AS courseId,
  r.layout_id AS layoutId, s.id AS scorecardId, r.version, r.updated_at AS updatedAt
  FROM rounds r JOIN round_players rp ON rp.round_id = r.id JOIN scorecards s ON s.round_player_id = rp.id
  WHERE r.created_by = ? AND r.event_id = ? AND r.status = 'IN_PROGRESS' LIMIT 1`;

async function hydrateRound(row: ActiveRoundRow): Promise<ActiveRound> {
  const result = await getD1Database().prepare(
    `SELECT hole_number AS holeNumber, strokes, penalties, updated_at AS updatedAt
     FROM hole_scores WHERE scorecard_id = ? ORDER BY hole_number`,
  ).bind(row.scorecardId).all<PersistedHoleScore>();
  return {
    id: row.id, eventId: row.eventId, courseId: row.courseId, layoutId: row.layoutId,
    scorecardId: row.scorecardId, holeScores: result.results, version: row.version, lastSyncedAt: row.updatedAt,
  };
}
