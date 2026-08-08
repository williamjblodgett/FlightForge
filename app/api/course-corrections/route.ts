import { apiError } from "@/lib/http/api-response";
import { checkRateLimit, isSameOriginMutation, requestClientKey } from "@/lib/security/request-security";
import { courseCorrectionSchema, submitCourseCorrection } from "@/modules/courses/correction-repository";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The correction request origin was rejected.", 403);
  const limit = await checkRateLimit("course-correction", requestClientKey(request), 5, 3600).catch(() => null);
  if (!limit) return apiError("GUARD_UNAVAILABLE", "Course corrections are temporarily unavailable.", 503);
  if (!limit.allowed) return apiError("RATE_LIMITED", "Too many correction requests. Try again later.", 429);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "The request body must be valid JSON.", 400); }
  const parsed = courseCorrectionSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Review the correction details.", 422);
  const requestRecord = await submitCourseCorrection(parsed.data).catch(() => null);
  return requestRecord ? Response.json({ request: requestRecord }, { status: 201 }) : apiError("SAVE_FAILED", "The correction could not be saved.", 503);
}
