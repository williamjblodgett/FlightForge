import { getD1Database } from "@/db/runtime";
import { ensurePersistedUserId } from "@/modules/auth/account-repository";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { EventEditorInput, EventStatusAction } from "./validation";
import type { EventRecord, EventStatus } from "./types";

type EventRow = Omit<EventRecord, "divisions"> & { divisionsJson: string };

export class EventConflictError extends Error {
  constructor(message = "This event changed in another session. Refresh and try again.") {
    super(message);
    this.name = "EventConflictError";
  }
}

export class EventAccessError extends Error {
  constructor() {
    super("You do not have permission to manage this event.");
    this.name = "EventAccessError";
  }
}

let schemaInitialization: Promise<void> | null = null;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, slug TEXT NOT NULL, organizer_user_id TEXT NOT NULL,
    organizer_email TEXT NOT NULL, organization_name TEXT NOT NULL, event_type TEXT NOT NULL,
    title TEXT NOT NULL, summary TEXT NOT NULL, description TEXT NOT NULL, course_id TEXT,
    venue_name TEXT NOT NULL, address_line_1 TEXT, city TEXT NOT NULL, region_code TEXT NOT NULL,
    country_code TEXT NOT NULL DEFAULT 'US', starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
    registration_opens_at TEXT, registration_closes_at TEXT, registration_url TEXT,
    contact_email TEXT NOT NULL, capacity INTEGER, entry_fee_cents INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD', format TEXT NOT NULL, divisions_json TEXT NOT NULL,
    accessibility_notes TEXT, status TEXT NOT NULL DEFAULT 'DRAFT',
    visibility TEXT NOT NULL DEFAULT 'PUBLIC', published_at TEXT, cancelled_at TEXT,
    cancellation_reason TEXT, idempotency_key TEXT, created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL, deleted_at TEXT, version INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS events_slug_unique ON events(slug)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS events_idempotency_unique ON events(idempotency_key)`,
  `CREATE INDEX IF NOT EXISTS events_public_schedule_idx ON events(status, visibility, starts_at)`,
  `CREATE INDEX IF NOT EXISTS events_organizer_updated_idx ON events(organizer_user_id, updated_at)`,
  `CREATE TABLE IF NOT EXISTS event_audit_events (
    id TEXT PRIMARY KEY, event_id TEXT NOT NULL, actor_user_id TEXT NOT NULL,
    action TEXT NOT NULL, from_status TEXT, to_status TEXT, reason TEXT,
    metadata_json TEXT, created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS event_audit_event_created_idx ON event_audit_events(event_id, created_at)`,
] as const;

export async function ensureEventSchema(): Promise<void> {
  if (!schemaInitialization) {
    schemaInitialization = getD1Database()
      .batch(schemaStatements.map((statement) => getD1Database().prepare(statement)))
      .then(() => undefined)
      .catch((error: unknown) => {
        schemaInitialization = null;
        throw error;
      });
  }
  await schemaInitialization;
}

export async function listPublishedEvents(): Promise<EventRecord[]> {
  await ensureEventSchema();
  const result = await getD1Database().prepare(
    `${eventSelect}
     WHERE status IN ('PUBLISHED', 'CANCELLED') AND visibility = 'PUBLIC' AND deleted_at IS NULL
     ORDER BY starts_at ASC`,
  ).all<EventRow>();
  return result.results.map(eventFromRow);
}

export async function listPublicEventBoard(): Promise<{ upcoming: EventRecord[]; past: EventRecord[] }> {
  await ensureEventSchema();
  const database = getD1Database();
  const [upcomingResult, pastResult] = await database.batch([
    database.prepare(
      `${eventSelect}
       WHERE status IN ('PUBLISHED', 'CANCELLED') AND visibility = 'PUBLIC'
         AND deleted_at IS NULL AND datetime(ends_at) >= datetime('now')
       ORDER BY starts_at ASC`,
    ),
    database.prepare(
      `${eventSelect}
       WHERE status IN ('PUBLISHED', 'CANCELLED') AND visibility = 'PUBLIC'
         AND deleted_at IS NULL AND datetime(ends_at) < datetime('now')
       ORDER BY starts_at DESC LIMIT 6`,
    ),
  ]);
  return {
    upcoming: (upcomingResult.results as unknown as EventRow[]).map(eventFromRow),
    past: (pastResult.results as unknown as EventRow[]).map(eventFromRow),
  };
}

export async function getPublishedEventBySlug(slug: string): Promise<EventRecord | null> {
  await ensureEventSchema();
  const row = await getD1Database().prepare(
    `${eventSelect}
     WHERE slug = ? AND status IN ('PUBLISHED', 'CANCELLED') AND visibility IN ('PUBLIC', 'UNLISTED')
       AND deleted_at IS NULL LIMIT 1`,
  ).bind(slug).first<EventRow>();
  return row ? eventFromRow(row) : null;
}

export async function listManagedEvents(user: AuthenticatedUser): Promise<EventRecord[]> {
  await ensureEventSchema();
  const userId = await ensurePersistedUserId(user);
  const admin = user.roles.includes("PLATFORM_ADMIN");
  const query = admin
    ? `${eventSelect} WHERE deleted_at IS NULL ORDER BY updated_at DESC`
    : `${eventSelect} WHERE organizer_user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC`;
  const statement = getD1Database().prepare(query);
  const result = admin ? await statement.all<EventRow>() : await statement.bind(userId).all<EventRow>();
  return result.results.map(eventFromRow);
}

export async function getManagedEvent(user: AuthenticatedUser, eventId: string): Promise<EventRecord | null> {
  await ensureEventSchema();
  const userId = await ensurePersistedUserId(user);
  const row = await getD1Database().prepare(`${eventSelect} WHERE id = ? AND deleted_at IS NULL LIMIT 1`)
    .bind(eventId).first<EventRow>();
  if (!row) return null;
  if (row.organizerUserId !== userId && !user.roles.includes("PLATFORM_ADMIN")) throw new EventAccessError();
  return eventFromRow(row);
}

export async function createEvent(
  user: AuthenticatedUser,
  input: EventEditorInput,
  idempotencyKey: string,
): Promise<EventRecord> {
  await ensureEventSchema();
  const database = getD1Database();
  const organizerUserId = await ensurePersistedUserId(user);
  const existing = await database.prepare(`${eventSelect} WHERE idempotency_key = ? LIMIT 1`)
    .bind(idempotencyKey).first<EventRow>();
  if (existing) {
    if (existing.organizerUserId !== organizerUserId) throw new EventAccessError();
    return eventFromRow(existing);
  }

  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const status: EventStatus = input.action === "PUBLISH" ? "PUBLISHED" : "DRAFT";
  const slug = await uniqueSlug(input.title);
  await database.batch([
    database.prepare(
      `INSERT INTO events (
        id, slug, organizer_user_id, organizer_email, organization_name, event_type,
        title, summary, description, course_id, venue_name, address_line_1, city,
        region_code, country_code, starts_at, ends_at, registration_opens_at,
        registration_closes_at, registration_url, contact_email, capacity,
        entry_fee_cents, currency, format, divisions_json, accessibility_notes,
        status, visibility, published_at, idempotency_key, created_at, updated_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    ).bind(
      id, slug, organizerUserId, user.email.toLowerCase(), input.organizationName, input.eventType,
      input.title, input.summary, input.description, input.courseId, input.venueName,
      input.addressLine1, input.city, input.regionCode, input.countryCode, input.startsAt,
      input.endsAt, input.registrationOpensAt, input.registrationClosesAt, input.registrationUrl,
      input.contactEmail, input.capacity, input.entryFeeCents, input.currency, input.format,
      JSON.stringify(input.divisions), input.accessibilityNotes, status, input.visibility,
      status === "PUBLISHED" ? timestamp : null, idempotencyKey, timestamp, timestamp,
    ),
    eventAuditStatement(database, id, organizerUserId, "EVENT_CREATED", null, status, "Created by event coordinator", timestamp),
    platformAuditStatement(database, organizerUserId, "EVENT_CREATED", id, timestamp),
  ]);
  const created = await getManagedEvent(user, id);
  if (!created) throw new Error("The saved event could not be loaded.");
  return created;
}

export async function updateEvent(
  user: AuthenticatedUser,
  eventId: string,
  input: EventEditorInput,
): Promise<EventRecord> {
  const current = await getManagedEvent(user, eventId);
  if (!current) throw new EventConflictError("That event no longer exists.");
  if (input.version !== current.version) throw new EventConflictError();
  const actorUserId = await ensurePersistedUserId(user);
  const nextStatus: EventStatus = input.action === "PUBLISH" ? "PUBLISHED" : "DRAFT";
  const timestamp = new Date().toISOString();
  const database = getD1Database();
  const nextVersion = current.version + 1;
  const results = await database.batch([
    database.prepare(
    `UPDATE events SET organization_name = ?, event_type = ?, title = ?, summary = ?,
      description = ?, course_id = ?, venue_name = ?, address_line_1 = ?, city = ?,
      region_code = ?, country_code = ?, starts_at = ?, ends_at = ?, registration_opens_at = ?,
      registration_closes_at = ?, registration_url = ?, contact_email = ?, capacity = ?,
      entry_fee_cents = ?, currency = ?, format = ?, divisions_json = ?, accessibility_notes = ?,
      status = ?, visibility = ?, published_at = CASE WHEN ? = 'PUBLISHED' THEN COALESCE(published_at, ?) ELSE NULL END,
      cancelled_at = NULL, cancellation_reason = NULL, updated_at = ?, version = version + 1
     WHERE id = ? AND version = ? AND deleted_at IS NULL`,
    ).bind(
    input.organizationName, input.eventType, input.title, input.summary, input.description,
    input.courseId, input.venueName, input.addressLine1, input.city, input.regionCode,
    input.countryCode, input.startsAt, input.endsAt, input.registrationOpensAt,
    input.registrationClosesAt, input.registrationUrl, input.contactEmail, input.capacity,
    input.entryFeeCents, input.currency, input.format, JSON.stringify(input.divisions),
    input.accessibilityNotes, nextStatus, input.visibility, nextStatus, timestamp, timestamp,
    eventId, current.version,
    ),
    conditionalEventAuditStatement(database, eventId, nextVersion, actorUserId, "EVENT_UPDATED", current.status, nextStatus, "Event details updated", timestamp),
    conditionalPlatformAuditStatement(database, eventId, nextVersion, actorUserId, "EVENT_UPDATED", timestamp),
  ]);
  if (!results[0]?.meta.changes) throw new EventConflictError();
  const updated = await getManagedEvent(user, eventId);
  if (!updated) throw new Error("The updated event could not be loaded.");
  return updated;
}

export async function changeEventStatus(
  user: AuthenticatedUser,
  eventId: string,
  action: EventStatusAction,
): Promise<EventRecord> {
  const current = await getManagedEvent(user, eventId);
  if (!current) throw new EventConflictError("That event no longer exists.");
  if (action.version !== current.version) throw new EventConflictError();
  const actorUserId = await ensurePersistedUserId(user);
  const nextStatus: EventStatus = action.action === "PUBLISH" ? "PUBLISHED" : action.action === "CANCEL" ? "CANCELLED" : "DRAFT";
  if (nextStatus === "PUBLISHED" && Date.parse(current.startsAt) < Date.now() - 5 * 60_000) {
    throw new EventConflictError("Past events cannot be published.");
  }
  const timestamp = new Date().toISOString();
  const database = getD1Database();
  const nextVersion = current.version + 1;
  const results = await database.batch([
    database.prepare(
    `UPDATE events SET status = ?,
      published_at = CASE WHEN ? = 'PUBLISHED' THEN COALESCE(published_at, ?) WHEN ? = 'DRAFT' THEN NULL ELSE published_at END,
      cancelled_at = CASE WHEN ? = 'CANCELLED' THEN ? ELSE NULL END,
      cancellation_reason = CASE WHEN ? = 'CANCELLED' THEN ? ELSE NULL END,
      updated_at = ?, version = version + 1
     WHERE id = ? AND version = ? AND deleted_at IS NULL`,
    ).bind(
    nextStatus, nextStatus, timestamp, nextStatus, nextStatus, timestamp, nextStatus,
    nextStatus === "CANCELLED" ? action.reason : null, timestamp, eventId, current.version,
    ),
    conditionalEventAuditStatement(database, eventId, nextVersion, actorUserId, `EVENT_${action.action}`, current.status, nextStatus, action.reason, timestamp),
    conditionalPlatformAuditStatement(database, eventId, nextVersion, actorUserId, `EVENT_${action.action}`, timestamp),
  ]);
  if (!results[0]?.meta.changes) throw new EventConflictError();
  const updated = await getManagedEvent(user, eventId);
  if (!updated) throw new Error("The updated event could not be loaded.");
  return updated;
}

const eventSelect = `SELECT id, slug, organizer_user_id AS organizerUserId,
  organizer_email AS organizerEmail, organization_name AS organizationName,
  event_type AS eventType, title, summary, description, course_id AS courseId,
  venue_name AS venueName, address_line_1 AS addressLine1, city,
  region_code AS regionCode, country_code AS countryCode, starts_at AS startsAt,
  ends_at AS endsAt, registration_opens_at AS registrationOpensAt,
  registration_closes_at AS registrationClosesAt, registration_url AS registrationUrl,
  contact_email AS contactEmail, capacity, entry_fee_cents AS entryFeeCents,
  currency, format, divisions_json AS divisionsJson, accessibility_notes AS accessibilityNotes,
  status, visibility, published_at AS publishedAt, cancelled_at AS cancelledAt,
  cancellation_reason AS cancellationReason, created_at AS createdAt,
  updated_at AS updatedAt, version FROM events`;

function eventFromRow(row: EventRow): EventRecord {
  return { ...row, divisions: safeStringArray(row.divisionsJson) };
}

function safeStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function uniqueSlug(title: string): Promise<string> {
  const base = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 80) || "event";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${crypto.randomUUID().slice(0, 6)}`;
    const slug = `${base}${suffix}`;
    const existing = await getD1Database().prepare("SELECT id FROM events WHERE slug = ? LIMIT 1").bind(slug).first();
    if (!existing) return slug;
  }
  return `${base}-${crypto.randomUUID().slice(0, 10)}`;
}

function eventAuditStatement(
  database: D1Database,
  eventId: string,
  actorUserId: string,
  action: string,
  fromStatus: EventStatus | null,
  toStatus: EventStatus,
  reason: string,
  createdAt: string,
): D1PreparedStatement {
  return database.prepare(
    `INSERT INTO event_audit_events
      (id, event_id, actor_user_id, action, from_status, to_status, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(crypto.randomUUID(), eventId, actorUserId, action, fromStatus, toStatus, reason, createdAt);
}

function platformAuditStatement(
  database: D1Database,
  actorUserId: string,
  action: string,
  eventId: string,
  createdAt: string,
): D1PreparedStatement {
  return database.prepare(
    `INSERT INTO audit_logs (id, actor_user_id, action, resource_type, resource_id, created_at)
     VALUES (?, ?, ?, 'event', ?, ?)`,
  ).bind(crypto.randomUUID(), actorUserId, action, eventId, createdAt);
}

function conditionalEventAuditStatement(
  database: D1Database,
  eventId: string,
  eventVersion: number,
  actorUserId: string,
  action: string,
  fromStatus: EventStatus,
  toStatus: EventStatus,
  reason: string,
  createdAt: string,
): D1PreparedStatement {
  return database.prepare(
    `INSERT INTO event_audit_events
      (id, event_id, actor_user_id, action, from_status, to_status, reason, created_at)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?
     WHERE EXISTS (SELECT 1 FROM events WHERE id = ? AND version = ?)`,
  ).bind(
    crypto.randomUUID(), eventId, actorUserId, action, fromStatus, toStatus, reason,
    createdAt, eventId, eventVersion,
  );
}

function conditionalPlatformAuditStatement(
  database: D1Database,
  eventId: string,
  eventVersion: number,
  actorUserId: string,
  action: string,
  createdAt: string,
): D1PreparedStatement {
  return database.prepare(
    `INSERT INTO audit_logs (id, actor_user_id, action, resource_type, resource_id, created_at)
     SELECT ?, ?, ?, 'event', ?, ?
     WHERE EXISTS (SELECT 1 FROM events WHERE id = ? AND version = ?)`,
  ).bind(crypto.randomUUID(), actorUserId, action, eventId, createdAt, eventId, eventVersion);
}
