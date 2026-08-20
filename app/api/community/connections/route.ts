import { apiError } from "@/lib/http/api-response";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { removeConnection, requestConnection, respondToConnection } from "@/modules/community/community-repository";
import { communityErrorResponse, requireCommunityActor } from "@/modules/community/route-support";
import { z } from "zod";

const targetSchema = z.object({ targetUserId: z.string().trim().min(1).max(200) });
const responseSchema = z.object({ connectionId: z.string().uuid(), action: z.enum(["ACCEPT", "DECLINE"]) });

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The connection request origin was rejected.", 403);
  try {
    const user = await requireCommunityActor();
    const rateLimit = await checkRateLimit("community-connection", user.id, 20, 3_600).catch(() => null);
    if (!rateLimit?.allowed) return apiError(rateLimit ? "RATE_LIMITED" : "RATE_LIMIT_UNAVAILABLE", "The connection request could not be sent right now.", rateLimit ? 429 : 503);
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Use valid JSON.", 400); }
    const parsed = targetSchema.safeParse(body);
    if (!parsed.success) return apiError("VALIDATION_ERROR", "Choose a valid player.", 422);
    return Response.json({ connection: await requestConnection(user, parsed.data.targetUserId) }, { status: 201 });
  } catch (error) { return communityErrorResponse(error); }
}
export async function PATCH(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The connection request origin was rejected.", 403);
  try {
    const user = await requireCommunityActor();
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Use valid JSON.", 400); }
    const parsed = responseSchema.safeParse(body);
    if (!parsed.success) return apiError("VALIDATION_ERROR", "Choose accept or decline for a valid request.", 422);
    return Response.json({ connection: await respondToConnection(user, parsed.data.connectionId, parsed.data.action === "ACCEPT") });
  } catch (error) { return communityErrorResponse(error); }
}

export async function DELETE(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The connection request origin was rejected.", 403);
  try {
    const user = await requireCommunityActor();
    const parsed = targetSchema.safeParse({ targetUserId: new URL(request.url).searchParams.get("targetUserId") });
    if (!parsed.success) return apiError("VALIDATION_ERROR", "Choose a valid player.", 422);
    return Response.json(await removeConnection(user, parsed.data.targetUserId));
  } catch (error) { return communityErrorResponse(error); }
}
