import { apiError } from "@/lib/http/api-response";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { createConversation, listUserConversations } from "@/modules/community/community-repository";
import { communityErrorResponse, requireCommunityActor } from "@/modules/community/route-support";
import { createConversationSchema } from "@/modules/community/validation";

export async function GET() {
  try {
    const user = await requireCommunityActor();
    return Response.json({ conversations: await listUserConversations(user.id) });
  } catch (error) {
    return communityErrorResponse(error);
  }
}
export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The community request origin was rejected.", 403);
  try {
    const user = await requireCommunityActor();
    const rateLimit = await checkRateLimit("community-conversation-create", user.id, 15, 3_600).catch(() => null);
    if (!rateLimit) return apiError("RATE_LIMIT_UNAVAILABLE", "Community protection is temporarily unavailable.", 503);
    if (!rateLimit.allowed) return apiError("RATE_LIMITED", "Too many new conversations. Try again later.", 429);
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Use valid JSON.", 400); }
    const parsed = createConversationSchema.safeParse(body);
    if (!parsed.success) return apiError("VALIDATION_ERROR", "Review the conversation details.", 422, parsed.error.flatten());
    return Response.json({ conversation: await createConversation(user, parsed.data) }, { status: 201 });
  } catch (error) {
    return communityErrorResponse(error);
  }
}
