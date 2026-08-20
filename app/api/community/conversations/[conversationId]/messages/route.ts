import { apiError } from "@/lib/http/api-response";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { listMessages, sendMessage } from "@/modules/community/community-repository";
import { boundedLimit, communityErrorResponse, requireCommunityActor } from "@/modules/community/route-support";
import { validIdempotencyKey } from "@/modules/community/policy";
import { sendMessageSchema } from "@/modules/community/validation";

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const user = await requireCommunityActor();
    const { conversationId } = await params;
    const url = new URL(request.url);
    return Response.json(await listMessages(user, conversationId, url.searchParams.get("cursor"), boundedLimit(url.searchParams.get("limit"))));
  } catch (error) {
    return communityErrorResponse(error);
  }
}
export async function POST(request: Request, { params }: RouteContext) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The community request origin was rejected.", 403);
  try {
    const user = await requireCommunityActor();
    const rateLimit = await checkRateLimit("community-message-send", user.id, 30, 60).catch(() => null);
    if (!rateLimit) return apiError("RATE_LIMIT_UNAVAILABLE", "Community protection is temporarily unavailable.", 503);
    if (!rateLimit.allowed) return apiError("RATE_LIMITED", "You are sending messages too quickly.", 429, { retryAfterSeconds: rateLimit.retryAfterSeconds });
    const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? null;
    if (!validIdempotencyKey(idempotencyKey)) return apiError("IDEMPOTENCY_KEY_REQUIRED", "A valid message idempotency key is required.", 400);
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Use valid JSON.", 400); }
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) return apiError("VALIDATION_ERROR", "Messages must contain 1 to 2,000 characters of text.", 422, parsed.error.flatten());
    const { conversationId } = await params;
    return Response.json({ message: await sendMessage(user, conversationId, parsed.data.body, idempotencyKey, parsed.data.replyToMessageId) }, { status: 201 });
  } catch (error) {
    return communityErrorResponse(error);
  }
}
