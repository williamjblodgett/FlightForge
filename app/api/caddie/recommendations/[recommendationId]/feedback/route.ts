import { apiError } from "@/lib/http/api-response";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { isFeatureEnabled } from "@/modules/config/feature-flags";
import { BagConflictError, recordCaddieFeedback } from "@/modules/bags/bag-repository";
import { caddieFeedbackSchema } from "@/modules/bags/validation";

type RouteContext = { params: Promise<{ recommendationId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The feedback request origin was rejected.", 403);
  if (!await isFeatureEnabled("ai_caddie")) return apiError("FEATURE_DISABLED", "The caddie is temporarily paused.", 503);
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to record caddie feedback.", 401);
  if (!can(user, "requestCaddieRecommendation")) return apiError("FORBIDDEN", "Your account cannot record caddie feedback.", 403);
  const rateLimit = await checkRateLimit("caddie-feedback", user.email, 120, 3600).catch(() => null);
  if (!rateLimit?.allowed) return apiError(rateLimit ? "RATE_LIMITED" : "RATE_LIMIT_UNAVAILABLE", "Feedback is temporarily limited. Try again later.", rateLimit ? 429 : 503);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "The request body must be valid JSON.", 400); }
  const parsed = caddieFeedbackSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Review the throw result and try again.", 422, parsed.error.flatten());
  const { recommendationId } = await params;
  try { return Response.json({ profile: await recordCaddieFeedback(user, recommendationId, parsed.data) }, { status: 201 }); }
  catch (error: unknown) {
    if (error instanceof BagConflictError) return apiError("FEEDBACK_CONFLICT", error.message, 409);
    return apiError("FEEDBACK_SAVE_FAILED", "The feedback could not be saved.", 503);
  }
}
