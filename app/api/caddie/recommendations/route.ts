import { apiError } from "@/lib/http/api-response";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { getAccountSettings } from "@/modules/auth/account-repository";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { isFeatureEnabled } from "@/modules/config/feature-flags";
import { createCaddieRecommendation } from "@/modules/bags/bag-repository";
import { caddieRequestSchema } from "@/modules/bags/validation";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The caddie request origin was rejected.", 403);
  if (!await isFeatureEnabled("ai_caddie")) return apiError("FEATURE_DISABLED", "The caddie is temporarily paused.", 503);
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to use your virtual caddie.", 401);
  if (!can(user, "requestCaddieRecommendation")) return apiError("FORBIDDEN", "Your account cannot request caddie recommendations.", 403);
  const settings = await getAccountSettings(user).catch(() => null);
  if (!settings?.aiRecommendations) return apiError("CADDIE_DISABLED", "Enable recommendations in Profile & privacy before using the caddie.", 403);
  const rateLimit = await checkRateLimit("caddie", user.email, 60, 3600).catch(() => null);
  if (!rateLimit?.allowed) return apiError(rateLimit ? "RATE_LIMITED" : "RATE_LIMIT_UNAVAILABLE", "Caddie requests are temporarily limited. Try again later.", rateLimit ? 429 : 503);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "The request body must be valid JSON.", 400); }
  const parsed = caddieRequestSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Review the shot details and try again.", 422, parsed.error.flatten());
  try { return Response.json(await createCaddieRecommendation(user, parsed.data), { status: 201 }); }
  catch { return apiError("CADDIE_UNAVAILABLE", "The caddie could not build a recommendation. Your bag remains available.", 503); }
}
