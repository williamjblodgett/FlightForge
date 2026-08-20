import { getD1Database } from "@/db/runtime";
import { ensurePersistedUserId } from "@/modules/auth/account-repository";
import type { AuthenticatedUser } from "@/modules/auth/types";
import { ensureEventSchema } from "@/modules/events/event-repository";
import type { EventRecord } from "@/modules/events/types";

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
  if (!columns.results.some((column) => column.name === "last_mutation_id")) await database.prepare("ALTER TABLE rounds ADD COLUMN last_mutation_id TEXT").run();
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

export async function listActiveRoundSummaries(user: AuthenticatedUser): Promise<ActiveRoundSummary[]> {
  await Promise.all([ensureRoundSchema(), ensureEventSchema()]);
  const userId = await ensurePersistedUserId(user);
  const result = await getD1Database().prepare(
    `SELECT r.id, r.event_id AS eventId, r.course_id AS courseId, e.title AS eventTitle,
      e.venue_name AS venueName, e.hole_count AS holeCount, r.updated_at AS updatedAt,
      COUNT(hs.id) AS completedHoles, COALESCE(SUM(hs.strokes + hs.penalties), 0) AS totalScore
     FROM rounds r
     JOIN events e ON e.id = r.event_id
     JOIN round_players rp ON rp.round_id = r.id AND rp.user_id = ?
     JOIN scorecards s ON s.round_player_id = rp.id
     LEFT JOIN hole_scores hs ON hs.scorecard_id = s.id
     WHERE r.created_by = ? AND r.status = 'IN_PROGRESS'
     GROUP BY r.id, r.event_id, r.course_id, e.title, e.venue_name, e.hole_count, r.updated_at
     ORDER BY r.updated_at DESC LIMIT 8`,
  ).bind(userId, userId).all<ActiveRoundSummary>();
  return result.results;
}

export async function saveHoleScore(user: AuthenticatedUser, event: EventRecord, input: {
  holeNumber: number;
  strokes: number;
  penalties: number;
  clientMutationId: string;
  expectedVersion?: number;
}): Promise<ActiveRound> {
  if (input.holeNumber < 1 || input.holeNumber > event.holeCount) throw new Error("That hole is not part of this event layout.");
  const round = await getOrCreateActiveRound(user, event);
  const database = getD1Database();
  const duplicate = await database.prepare(
    "SELECT id FROM round_score_audit_events WHERE client_mutation_id = ? LIMIT 1",
  ).bind(input.clientMutationId).first();
  if (duplicate) return getOrCreateActiveRound(user, event);
  const expectedVersion = input.expectedVersion ?? round.version;
  if (round.version !== expectedVersion) throw new RoundConflictError(round);
  const userId = await ensurePersistedUserId(user);
  const prior = await database.prepare(
    "SELECT strokes, penalties FROM hole_scores WHERE scorecard_id = ? AND hole_number = ? LIMIT 1",
  ).bind(round.scorecardId, input.holeNumber).first<{ strokes: number; penalties: number }>();
  const now = new Date().toISOString();
  const results = await database.batch([
    database.prepare(
      `UPDATE rounds SET updated_at = ?, version = version + 1, last_mutation_id = ?
       WHERE id = ? AND version = ?`,
    ).bind(now, input.clientMutationId, round.id, expectedVersion),
    database.prepare(
      `INSERT INTO hole_scores
        (id, scorecard_id, hole_number, strokes, penalties, completed_at, client_mutation_id, created_at, updated_at, version)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 1
       WHERE EXISTS (SELECT 1 FROM rounds WHERE id = ? AND last_mutation_id = ?)
       ON CONFLICT(scorecard_id, hole_number) DO UPDATE SET
         strokes = excluded.strokes, penalties = excluded.penalties, completed_at = excluded.completed_at,
         client_mutation_id = excluded.client_mutation_id, updated_at = excluded.updated_at, version = hole_scores.version + 1`,
    ).bind(crypto.randomUUID(), round.scorecardId, input.holeNumber, input.strokes, input.penalties, now, input.clientMutationId, now, now, round.id, input.clientMutationId),
    database.prepare(
      `INSERT INTO round_score_audit_events
        (id, round_id, scorecard_id, hole_number, actor_user_id, from_strokes, to_strokes,
         from_penalties, to_penalties, client_mutation_id, created_at)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
       WHERE EXISTS (SELECT 1 FROM rounds WHERE id = ? AND last_mutation_id = ?)`,
    ).bind(crypto.randomUUID(), round.id, round.scorecardId, input.holeNumber, userId,
      prior?.strokes ?? null, input.strokes, prior?.penalties ?? null, input.penalties, input.clientMutationId, now, round.id, input.clientMutationId),
    database.prepare(
      `UPDATE scorecards SET total_score = (SELECT SUM(strokes + penalties) FROM hole_scores WHERE scorecard_id = ?),
       updated_at = ?, version = version + 1 WHERE id = ?
       AND EXISTS (SELECT 1 FROM rounds WHERE id = ? AND last_mutation_id = ?)`,
    ).bind(round.scorecardId, now, round.scorecardId, round.id, input.clientMutationId),
  ]);
  if (!results[0]?.meta.changes) throw new RoundConflictError(await getOrCreateActiveRound(user, event));
  return getOrCreateActiveRound(user, event);
}

export async function completeActiveRound(user: AuthenticatedUser, event: EventRecord, input: {
  roundId: string;
  clientMutationId: string;
  expectedVersion: number;
}): Promise<CompletedRound> {
  await ensureRoundSchema();
  const userId = await ensurePersistedUserId(user);
  const database = getD1Database();
  const row = await database.prepare(
    `SELECT r.id, r.event_id AS eventId, r.course_id AS courseId, r.layout_id AS layoutId,
      r.status, r.completed_at AS completedAt, r.last_mutation_id AS lastMutationId,
      r.version, r.updated_at AS updatedAt, s.id AS scorecardId
     FROM rounds r
     JOIN round_players rp ON rp.round_id = r.id AND rp.user_id = ?
     JOIN scorecards s ON s.round_player_id = rp.id
     WHERE r.id = ? AND r.event_id = ? AND r.created_by = ? LIMIT 1`,
  ).bind(userId, input.roundId, event.id, userId).first<CompletionRoundRow>();
  if (!row) throw new RoundUnavailableError();
  if (row.status === "COMPLETED" && row.lastMutationId === input.clientMutationId && row.completedAt) {
    return completedRoundFromRow(row, await scorecardTotal(row.scorecardId));
  }
  if (row.status !== "IN_PROGRESS") throw new RoundUnavailableError();
  if (row.version !== input.expectedVersion) throw new RoundConflictError(await hydrateRound(row));

  const scoreState = await database.prepare(
    `SELECT COUNT(*) AS scoreCount, MIN(hole_number) AS firstHole, MAX(hole_number) AS lastHole,
      COALESCE(SUM(strokes + penalties), 0) AS totalScore
     FROM hole_scores WHERE scorecard_id = ? AND hole_number BETWEEN 1 AND ?`,
  ).bind(row.scorecardId, event.holeCount).first<{
    scoreCount: number;
    firstHole: number | null;
    lastHole: number | null;
    totalScore: number;
  }>();
  if (!scoreState || Number(scoreState.scoreCount) !== event.holeCount
    || Number(scoreState.firstHole) !== 1 || Number(scoreState.lastHole) !== event.holeCount) {
    throw new RoundIncompleteError();
  }

  const completedAt = new Date().toISOString();
  const result = await database.batch([
    database.prepare(
      `UPDATE rounds SET status = 'COMPLETED', completed_at = ?, updated_at = ?,
        last_mutation_id = ?, version = version + 1
       WHERE id = ? AND created_by = ? AND status = 'IN_PROGRESS' AND version = ?`,
    ).bind(completedAt, completedAt, input.clientMutationId, row.id, userId, input.expectedVersion),
    database.prepare(
      `INSERT INTO audit_logs
        (id, actor_user_id, action, resource_type, resource_id, reason, created_at)
       SELECT ?, ?, 'ROUND_COMPLETED', 'round', ?, 'Player confirmed the completed scorecard.', ?
       WHERE EXISTS (SELECT 1 FROM rounds WHERE id = ? AND status = 'COMPLETED' AND last_mutation_id = ?)`,
    ).bind(crypto.randomUUID(), userId, row.id, completedAt, row.id, input.clientMutationId),
  ]);
  if (!result[0]?.meta.changes) {
    const current = await database.prepare(activeRoundSelect).bind(userId, event.id).first<ActiveRoundRow>();
    if (current) throw new RoundConflictError(await hydrateRound(current));
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
  scorecardId: string; version: number; updatedAt: string;
};

type CompletionRoundRow = ActiveRoundRow & {
  status: string;
  completedAt: string | null;
  lastMutationId: string | null;
};

const activeRoundSelect = `SELECT r.id, r.event_id AS eventId, r.course_id AS courseId,
  r.layout_id AS layoutId, s.id AS scorecardId, r.version, r.updated_at AS updatedAt
  FROM rounds r JOIN round_players rp ON rp.round_id = r.id JOIN scorecards s ON s.round_player_id = rp.id
  WHERE r.created_by = ? AND r.event_id = ? AND r.status = 'IN_PROGRESS' LIMIT 1`;

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
