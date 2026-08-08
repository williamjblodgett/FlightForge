import { z } from "zod";
import { getD1Database } from "@/db/runtime";

export const courseCorrectionSchema = z.object({
  courseId: z.preprocess((value) => value === "" ? null : value, z.string().trim().min(3).max(120).nullable()),
  courseName: z.string().trim().min(2).max(160),
  reporterName: z.string().trim().min(2).max(100),
  reporterEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  correctionType: z.enum(["LOCATION", "ACCESS", "HOURS", "CLOSURE", "CONTACT", "OTHER"]),
  details: z.string().trim().min(20).max(3000),
  sourceUrl: z.union([z.literal(""), z.url().max(1000)]).transform((value) => value || null),
});

export type CourseCorrectionInput = z.infer<typeof courseCorrectionSchema>;

export async function submitCourseCorrection(input: CourseCorrectionInput) {
  const database = getD1Database();
  await database.prepare(`CREATE TABLE IF NOT EXISTS course_correction_requests (
    id TEXT PRIMARY KEY, course_id TEXT, course_name TEXT NOT NULL, reporter_name TEXT NOT NULL,
    reporter_email TEXT NOT NULL, correction_type TEXT NOT NULL, details TEXT NOT NULL,
    source_url TEXT, status TEXT NOT NULL DEFAULT 'PENDING', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`).run();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await database.prepare(`INSERT INTO course_correction_requests
    (id, course_id, course_name, reporter_name, reporter_email, correction_type, details, source_url, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`)
    .bind(id, input.courseId, input.courseName, input.reporterName, input.reporterEmail, input.correctionType, input.details, input.sourceUrl, now, now).run();
  return { id, status: "PENDING" as const };
}
