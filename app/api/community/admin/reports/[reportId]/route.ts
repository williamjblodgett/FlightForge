import { apiError } from "@/lib/http/api-response";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { reviewReport } from "@/modules/community/community-repository";
import { communityErrorResponse, requireCommunityActor } from "@/modules/community/route-support";
import { moderationReviewSchema } from "@/modules/community/validation";

type RouteContext = { params: Promise<{ reportId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The moderation request origin was rejected.", 403);
  try {
    const user = await requireCommunityActor();
    const rateLimit = await checkRateLimit("community-moderation", user.id, 120, 3_600).catch(() => null);
    if (!rateLimit?.allowed) return apiError(rateLimit ? "RATE_LIMITED" : "RATE_LIMIT_UNAVAILABLE", "Moderation is temporarily unavailable.", rateLimit ? 429 : 503);
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Use valid JSON.", 400); }
    const parsed = moderationReviewSchema.safeParse(body);
    if (!parsed.success) return apiError("VALIDATION_ERROR", "Choose a valid action and provide a reason.", 422, parsed.error.flatten());
    const { reportId } = await params;
    return Response.json({ report: await reviewReport(user, reportId, parsed.data) });
  } catch (error) { return communityErrorResponse(error); }
}
