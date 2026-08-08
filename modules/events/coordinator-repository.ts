import { z } from "zod";
import { getD1Database } from "@/db/runtime";
import { ensurePersistedUserId } from "@/modules/auth/account-repository";
import type { AuthenticatedUser } from "@/modules/auth/types";

export const coordinatorApplicationSchema = z.object({ courseId: z.string().trim().min(3).max(120), organizationName: z.string().trim().min(2).max(160), experience: z.string().trim().min(30).max(3000) });
export const coordinatorReviewSchema = z.object({ decision: z.enum(["APPROVED", "REJECTED"]), reason: z.string().trim().min(12).max(1000) });
export type CoordinatorApplication = { id: string; userId: string; courseId: string; organizationName: string; experience: string; status: string; reviewReason: string | null; createdAt: string };

export async function applyForCoordinator(user: AuthenticatedUser, input: z.infer<typeof coordinatorApplicationSchema>) {
  await ensureCoordinatorSchema(); const userId = await ensurePersistedUserId(user); const now = new Date().toISOString(); const id = crypto.randomUUID();
  await getD1Database().prepare(`INSERT INTO coordinator_applications
    (id, user_id, course_id, organization_name, requested_role, experience, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'TOURNAMENT_DIRECTOR', ?, 'PENDING', ?, ?)`)
    .bind(id, userId, input.courseId, input.organizationName, input.experience, now, now).run();
  return { id, status: "PENDING" as const };
}

export async function listCoordinatorApplications(): Promise<CoordinatorApplication[]> {
  await ensureCoordinatorSchema(); const result = await getD1Database().prepare(`SELECT id, user_id AS userId, course_id AS courseId,
    organization_name AS organizationName, experience, status, review_reason AS reviewReason, created_at AS createdAt
    FROM coordinator_applications ORDER BY CASE status WHEN 'PENDING' THEN 0 ELSE 1 END, created_at`).all<CoordinatorApplication>(); return result.results;
}

export async function reviewCoordinatorApplication(admin: AuthenticatedUser, id: string, input: z.infer<typeof coordinatorReviewSchema>) {
  await ensureCoordinatorSchema(); const reviewerId = await ensurePersistedUserId(admin); const database = getD1Database();
  const record = await database.prepare("SELECT user_id AS userId, course_id AS courseId, organization_name AS organizationName, status FROM coordinator_applications WHERE id = ?").bind(id).first<{ userId: string; courseId: string; organizationName: string; status: string }>();
  if (!record || record.status !== "PENDING") return null; const now = new Date().toISOString();
  const organizationId = `org-${crypto.randomUUID()}`; const organizationName = record.organizationName;
  const statements: D1PreparedStatement[] = [database.prepare("UPDATE coordinator_applications SET status = ?, reviewed_by = ?, review_reason = ?, updated_at = ? WHERE id = ? AND status = 'PENDING'").bind(input.decision, reviewerId, input.reason, now, id)];
  if (input.decision === "APPROVED") statements.push(
    database.prepare("INSERT INTO organizations (id, name, slug, organization_type, created_at, updated_at, version) VALUES (?, ?, ?, 'EVENT_ORGANIZER', ?, ?, 1)").bind(organizationId, organizationName, `event-org-${organizationId.slice(-8)}`, now, now),
    database.prepare("INSERT INTO organization_memberships (id, organization_id, user_id, status, permissions_json, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?)").bind(crypto.randomUUID(), organizationId, record.userId, JSON.stringify(["MANAGE_EVENTS"]), now, now),
    database.prepare("INSERT INTO organization_course_access (organization_id, course_id, created_at) VALUES (?, ?, ?)").bind(organizationId, record.courseId, now),
    database.prepare("INSERT INTO user_roles (user_id, role, organization_id, created_at, created_by) VALUES (?, 'TOURNAMENT_DIRECTOR', ?, ?, ?)").bind(record.userId, organizationId, now, reviewerId),
  );
  statements.push(database.prepare("INSERT INTO audit_logs (id, actor_user_id, organization_id, action, resource_type, resource_id, reason, created_at) VALUES (?, ?, ?, ?, 'coordinator_application', ?, ?, ?)").bind(crypto.randomUUID(), reviewerId, input.decision === "APPROVED" ? organizationId : null, `COORDINATOR_${input.decision}`, id, input.reason, now));
  await database.batch(statements); return { id, status: input.decision };
}

export async function canCoordinateCourse(user: AuthenticatedUser, courseId: string | null) {
  if (user.roles.includes("PLATFORM_ADMIN")) return true;
  if (!courseId) return false;
  const userId = await ensurePersistedUserId(user); await ensureCoordinatorSchema();
  const row = await getD1Database().prepare(`SELECT 1 AS allowed FROM organization_memberships m
    JOIN organization_course_access a ON a.organization_id = m.organization_id
    JOIN user_roles r ON r.user_id = m.user_id AND r.organization_id = m.organization_id AND r.role IN ('TOURNAMENT_DIRECTOR','COURSE_OWNER')
    WHERE m.user_id = ? AND m.status = 'ACTIVE' AND a.course_id = ? LIMIT 1`).bind(userId, courseId).first(); return Boolean(row);
}

async function ensureCoordinatorSchema() {
  const database = getD1Database(); await database.batch([
    database.prepare("CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL, organization_type TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, version INTEGER NOT NULL DEFAULT 1)"),
    database.prepare("CREATE TABLE IF NOT EXISTS organization_memberships (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, user_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE', permissions_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    database.prepare("CREATE TABLE IF NOT EXISTS coordinator_applications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, organization_id TEXT, organization_name TEXT NOT NULL, course_id TEXT, requested_role TEXT NOT NULL, experience TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', reviewed_by TEXT, review_reason TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    database.prepare("CREATE TABLE IF NOT EXISTS organization_course_access (organization_id TEXT NOT NULL, course_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (organization_id, course_id))"),
  ]);
  const columns = await database.prepare("PRAGMA table_info(coordinator_applications)").all<{ name: string }>();
  if (!columns.results.some((column) => column.name === "organization_name")) await database.prepare("ALTER TABLE coordinator_applications ADD COLUMN organization_name TEXT NOT NULL DEFAULT 'Event organization'").run();
}
