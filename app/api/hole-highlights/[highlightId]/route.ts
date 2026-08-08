import { apiError } from "@/lib/http/api-response";
import { isSameOriginMutation } from "@/lib/security/request-security";
import { getCurrentUser } from "@/modules/auth/current-user";
import { deleteHoleHighlight } from "@/modules/highlights/highlight-repository";

export async function DELETE(request: Request, context: { params: Promise<{ highlightId: string }> }) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The delete origin was rejected.", 403);
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to delete your video.", 401);
  const { highlightId } = await context.params;
  const deleted = await deleteHoleHighlight(highlightId, user).catch(() => false);
  return deleted ? Response.json({ ok: true }) : apiError("NOT_FOUND", "The video was not found or is not yours.", 404);
}
