import { apiError } from "@/lib/http/api-response";
import { isSameOriginMutation } from "@/lib/security/request-security";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { deleteCoachingUpload } from "@/modules/media-analysis/coaching-repository";

export async function DELETE(request: Request, context: { params: Promise<{ uploadId: string }> }) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The deletion origin was rejected.", 403);
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to delete a coaching session.", 401);
  if (!can(user, "useCameraCoach")) return apiError("FORBIDDEN", "Your account cannot manage coaching media.", 403);
  const { uploadId } = await context.params;
  try {
    const deleted = await deleteCoachingUpload(user, uploadId);
    return deleted ? new Response(null, { status: 204 }) : apiError("NOT_FOUND", "That coaching session was not found.", 404);
  } catch { return apiError("DELETE_FAILED", "The media could not be deleted. Please retry.", 503); }
}
