import { apiError } from "@/lib/http/api-response";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { deleteMessage, editMessage } from "@/modules/community/community-repository";
import { communityErrorResponse, requireCommunityActor } from "@/modules/community/route-support";
import { editMessageSchema } from "@/modules/community/validation";

type RouteContext = { params: Promise<{ conversationId: string; messageId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The community request origin was rejected.", 403);
  try {
    const user = await requireCommunityActor();
    const rateLimit = await checkRateLimit("community-message-edit", user.id, 30, 3_600).catch(() => null);
    if (!rateLimit?.allowed) return apiError(rateLimit ? "RATE_LIMITED" : "RATE_LIMIT_UNAVAILABLE", "The message cannot be edited right now.", rateLimit ? 429 : 503);
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Use valid JSON.", 400); }
    const parsed = editMessageSchema.safeParse(body);
    if (!parsed.success) return apiError("VALIDATION_ERROR", "Messages must contain 1 to 2,000 characters of text.", 422, parsed.error.flatten());
    const { conversationId, messageId } = await params;
    return Response.json({ message: await editMessage(user, conversationId, messageId, parsed.data.body) });
  } catch (error) { return communityErrorResponse(error); }
}
export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The community request origin was rejected.", 403);
  try {
    const user = await requireCommunityActor();
    const { conversationId, messageId } = await params;
    return Response.json(await deleteMessage(user, conversationId, messageId));
  } catch (error) { return communityErrorResponse(error); }
}
