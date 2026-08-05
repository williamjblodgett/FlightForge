import { apiError } from "@/lib/http/api-response";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { isFeatureEnabled } from "@/modules/config/feature-flags";
import { addPlayerDisc, BagConflictError, listPlayerDiscs } from "@/modules/bags/bag-repository";
import { playerDiscInputSchema } from "@/modules/bags/validation";

export async function GET() {
  if (!await isFeatureEnabled("digital_bag")) return apiError("FEATURE_DISABLED", "Digital bags are temporarily paused.", 503);
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to view your digital bag.", 401);
  if (!can(user, "manageOwnBag")) return apiError("FORBIDDEN", "Your account cannot manage a digital bag.", 403);
  try { return Response.json({ discs: await listPlayerDiscs(user) }); }
  catch { return apiError("BAG_UNAVAILABLE", "Your digital bag is temporarily unavailable.", 503); }
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The bag request origin was rejected.", 403);
  if (!await isFeatureEnabled("digital_bag")) return apiError("FEATURE_DISABLED", "Digital bags are temporarily paused.", 503);
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to add a disc.", 401);
  if (!can(user, "manageOwnBag")) return apiError("FORBIDDEN", "Your account cannot manage a digital bag.", 403);
  const rateLimit = await checkRateLimit("bag-write", user.email, 120, 3600).catch(() => null);
  if (!rateLimit?.allowed) return apiError(rateLimit ? "RATE_LIMITED" : "RATE_LIMIT_UNAVAILABLE", "Disc changes are temporarily limited. Try again later.", rateLimit ? 429 : 503);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "The request body must be valid JSON.", 400); }
  const parsed = playerDiscInputSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Review the disc details and try again.", 422, parsed.error.flatten());
  try { return Response.json({ disc: await addPlayerDisc(user, parsed.data) }, { status: 201 }); }
  catch (error: unknown) {
    if (error instanceof BagConflictError) return apiError("BAG_CONFLICT", error.message, 409);
    return apiError("DISC_SAVE_FAILED", "The disc could not be saved.", 503);
  }
}
