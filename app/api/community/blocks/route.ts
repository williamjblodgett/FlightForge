import { apiError } from "@/lib/http/api-response";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { blockUser, unblockUser } from "@/modules/community/community-repository";
import { communityErrorResponse, requireCommunityActor } from "@/modules/community/route-support";
import { blockUserSchema } from "@/modules/community/validation";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The community request origin was rejected.", 403);
  try {
    const user = await requireCommunityActor();
    const rateLimit = await checkRateLimit("community-block", user.id, 30, 3_600).catch(() => null);
    if (!rateLimit?.allowed) return apiError(rateLimit ? "RATE_LIMITED" : "RATE_LIMIT_UNAVAILABLE", "The block could not be changed right now.", rateLimit ? 429 : 503);
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Use valid JSON.", 400); }
    const parsed = blockUserSchema.safeParse(body);
    if (!parsed.success) return apiError("VALIDATION_ERROR", "Choose a valid player to block.", 422);
    return Response.json(await blockUser(user, parsed.data.blockedUserId), { status: 201 });
  } catch (error) { return communityErrorResponse(error); }
}
export async function DELETE(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The community request origin was rejected.", 403);
  try {
    const user = await requireCommunityActor();
    const parsed = blockUserSchema.safeParse({ blockedUserId: new URL(request.url).searchParams.get("blockedUserId") });
    if (!parsed.success) return apiError("VALIDATION_ERROR", "Choose a valid player to unblock.", 422);
    return Response.json(await unblockUser(user, parsed.data.blockedUserId));
  } catch (error) { return communityErrorResponse(error); }
}
