import { apiError } from "@/lib/http/api-response";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { applyConversationAction } from "@/modules/community/community-repository";
import { communityErrorResponse, requireCommunityActor } from "@/modules/community/route-support";
import { conversationActionSchema } from "@/modules/community/validation";

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The community request origin was rejected.", 403);
  try {
    const user = await requireCommunityActor();
    const rateLimit = await checkRateLimit("community-conversation-action", user.id, 120, 3_600).catch(() => null);
    if (!rateLimit) return apiError("RATE_LIMIT_UNAVAILABLE", "Community protection is temporarily unavailable.", 503);
    if (!rateLimit.allowed) return apiError("RATE_LIMITED", "Too many conversation updates. Try again later.", 429);
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Use valid JSON.", 400); }
    const parsed = conversationActionSchema.safeParse(body);
    if (!parsed.success) return apiError("VALIDATION_ERROR", "Choose a valid conversation action.", 422, parsed.error.flatten());
    const { conversationId } = await params;
    return Response.json(await applyConversationAction(user, conversationId, parsed.data));
  } catch (error) {
    return communityErrorResponse(error);
  }
}
