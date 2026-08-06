import { apiError } from "@/lib/http/api-response";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { listCoachingUploads, saveCoachingUpload } from "@/modules/media-analysis/coaching-repository";
import { coachingContextSchema } from "@/modules/media-analysis/coaching-validation";
import { evaluateMediaUpload } from "@/modules/media-analysis/upload-safety";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to view coaching sessions.", 401);
  if (!can(user, "useCameraCoach")) return apiError("FORBIDDEN", "Your account cannot use camera coaching.", 403);
  try { return Response.json({ uploads: await listCoachingUploads(user) }); }
  catch { return apiError("COACHING_UNAVAILABLE", "Your private coaching history is temporarily unavailable.", 503); }
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The upload origin was rejected.", 403);
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to upload a throw.", 401);
  if (!can(user, "useCameraCoach")) return apiError("FORBIDDEN", "Your account cannot use camera coaching.", 403);
  const limit = await checkRateLimit("coaching-upload", user.id, 10, 3600).catch(() => null);
  if (!limit) return apiError("RATE_LIMIT_UNAVAILABLE", "Upload protection is temporarily unavailable.", 503);
  if (!limit.allowed) return apiError("RATE_LIMITED", "You reached the hourly coaching upload limit.", 429);
  let form: FormData;
  try { form = await request.formData(); } catch { return apiError("INVALID_FORM", "Submit multipart form data.", 400); }
  const file = form.get("video");
  if (!(file instanceof File)) return apiError("VIDEO_REQUIRED", "Record or choose a coaching video.", 422);
  const parsed = coachingContextSchema.safeParse({
    throwType: form.get("throwType"), cameraAngle: form.get("cameraAngle"), intendedShot: form.get("intendedShot"),
    discUsed: form.get("discUsed") ?? "", approximateDistanceFeet: form.get("approximateDistanceFeet") || undefined,
    result: form.get("result"), analysisQuestion: form.get("analysisQuestion"), durationSeconds: form.get("durationSeconds"),
    userIsMinor: form.get("userIsMinor") === "true", guardianConsent: form.get("guardianConsent") === "true",
    consentToAnalyze: form.get("consentToAnalyze") === "true", retainDays: form.get("retainDays"),
    idempotencyKey: form.get("idempotencyKey"),
  });
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Check the recording details and consent choices.", 422, parsed.error.flatten());
  const decision = evaluateMediaUpload({ fileName: file.name, mimeType: file.type, sizeBytes: file.size, durationSeconds: parsed.data.durationSeconds, consentToAnalyze: true, userIsMinor: parsed.data.userIsMinor, guardianConsent: parsed.data.guardianConsent });
  if (!decision.accepted) return apiError("UNSAFE_UPLOAD", decision.reasons.join(" "), 422);
  try { return Response.json({ upload: await saveCoachingUpload(user, file, parsed.data) }, { status: 201 }); }
  catch (error) { return apiError("UPLOAD_FAILED", error instanceof Error && error.name === "CoachingMediaError" ? error.message : "The private upload could not be saved. No successful analysis was reported.", error instanceof Error && error.name === "CoachingMediaError" ? 422 : 503); }
}
