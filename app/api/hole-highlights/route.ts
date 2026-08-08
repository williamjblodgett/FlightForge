import { apiError } from "@/lib/http/api-response";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { getCurrentUser } from "@/modules/auth/current-user";
import { listHoleHighlights, saveHoleHighlight } from "@/modules/highlights/highlight-repository";
import { holeHighlightContextSchema } from "@/modules/highlights/validation";

const supportedTypes = new Set(["video/mp4", "video/quicktime", "video/webm"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId")?.trim() ?? "";
  const eventId = url.searchParams.get("eventId")?.trim() ?? "";
  if (!/^[a-zA-Z0-9:_-]{2,120}$/u.test(courseId) || !/^[a-zA-Z0-9:_-]{2,120}$/u.test(eventId)) {
    return apiError("INVALID_CONTEXT", "A valid course and event are required.", 400);
  }
  try { return Response.json({ highlights: await listHoleHighlights(courseId, eventId, await getCurrentUser()) }); }
  catch { return apiError("HIGHLIGHTS_UNAVAILABLE", "Hole highlights are temporarily unavailable.", 503); }
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The upload origin was rejected.", 403);
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to share a hole highlight.", 401);
  const limit = await checkRateLimit("hole-highlight-upload", user.id, 8, 3600).catch(() => null);
  if (!limit) return apiError("RATE_LIMIT_UNAVAILABLE", "Upload protection is temporarily unavailable.", 503);
  if (!limit.allowed) return apiError("RATE_LIMITED", "You reached the hourly highlight limit.", 429);
  let form: FormData;
  try { form = await request.formData(); } catch { return apiError("INVALID_FORM", "Submit multipart form data.", 400); }
  const file = form.get("video");
  if (!(file instanceof File)) return apiError("VIDEO_REQUIRED", "Record or choose a video.", 422);
  if (!supportedTypes.has(file.type)) return apiError("UNSUPPORTED_VIDEO", "Use an MP4, MOV, or WebM video.", 422);
  if (file.size <= 0 || file.size > 25 * 1024 * 1024) return apiError("VIDEO_SIZE_INVALID", "Videos must be 25 MB or smaller.", 422);
  const parsed = holeHighlightContextSchema.safeParse({
    courseId: form.get("courseId"), eventId: form.get("eventId"), holeNumber: form.get("holeNumber"),
    caption: form.get("caption") ?? "", durationSeconds: form.get("durationSeconds"),
    rightsConfirmed: form.get("rightsConfirmed") === "true",
    participantConsentConfirmed: form.get("participantConsentConfirmed") === "true",
    containsMinor: form.get("containsMinor") === "true",
    guardianConsentConfirmed: form.get("guardianConsentConfirmed") === "true",
    idempotencyKey: form.get("idempotencyKey"),
  });
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Review the video details and consent choices.", 422, parsed.error.flatten());
  try { return Response.json({ highlight: await saveHoleHighlight(user, file, parsed.data) }, { status: 201 }); }
  catch (error) {
    const safeMessage = error instanceof Error && error.name === "HoleHighlightError" ? error.message : "The private upload could not be saved.";
    return apiError("UPLOAD_FAILED", safeMessage, error instanceof Error && error.name === "HoleHighlightError" ? 422 : 503);
  }
}
