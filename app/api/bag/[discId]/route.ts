import { apiError } from "@/lib/http/api-response";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { isFeatureEnabled } from "@/modules/config/feature-flags";
import { BagConflictError, removePlayerDisc, updatePlayerDisc } from "@/modules/bags/bag-repository";
import { playerDiscInputSchema } from "@/modules/bags/validation";
import { z } from "zod";

type RouteContext = { params: Promise<{ discId: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  return withBagMutation(request, async (user) => {
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "The request body must be valid JSON.", 400); }
    const parsed = playerDiscInputSchema.safeParse(body);
    if (!parsed.success) return apiError("VALIDATION_ERROR", "Review the disc details and try again.", 422, parsed.error.flatten());
    const { discId } = await params;
    return Response.json({ disc: await updatePlayerDisc(user, discId, parsed.data) });
  });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  return withBagMutation(request, async (user) => {
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "The request body must be valid JSON.", 400); }
    const parsed = z.object({ version: z.number().int().positive() }).safeParse(body);
    if (!parsed.success) return apiError("VALIDATION_ERROR", "A current record version is required.", 422, parsed.error.flatten());
    const { discId } = await params;
    await removePlayerDisc(user, discId, parsed.data.version);
    return new Response(null, { status: 204 });
  });
}

async function withBagMutation(
  request: Request,
  action: (user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) => Promise<Response>,
): Promise<Response> {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The bag request origin was rejected.", 403);
  if (!await isFeatureEnabled("digital_bag")) return apiError("FEATURE_DISABLED", "Digital bags are temporarily paused.", 503);
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to manage your bag.", 401);
  if (!can(user, "manageOwnBag")) return apiError("FORBIDDEN", "Your account cannot manage a digital bag.", 403);
  const rateLimit = await checkRateLimit("bag-write", user.email, 120, 3600).catch(() => null);
  if (!rateLimit?.allowed) return apiError(rateLimit ? "RATE_LIMITED" : "RATE_LIMIT_UNAVAILABLE", "Disc changes are temporarily limited. Try again later.", rateLimit ? 429 : 503);
  try { return await action(user); }
  catch (error: unknown) {
    if (error instanceof BagConflictError) return apiError("BAG_CONFLICT", error.message, 409);
    return apiError("DISC_UPDATE_FAILED", "The disc could not be updated.", 503);
  }
}
