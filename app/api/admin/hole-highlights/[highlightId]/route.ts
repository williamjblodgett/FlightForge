import { apiError } from "@/lib/http/api-response";
import { isSameOriginMutation } from "@/lib/security/request-security";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { reviewHoleHighlight } from "@/modules/highlights/highlight-repository";
import { highlightReviewSchema } from "@/modules/highlights/validation";

export async function PATCH(request: Request, context: { params: Promise<{ highlightId: string }> }) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The review origin was rejected.", 403);
  const user = await getCurrentUser();
  if (!can(user, "moderateHoleHighlights")) return apiError("FORBIDDEN", "Platform-administrator access is required.", 403);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Submit valid JSON.", 400); }
  const parsed = highlightReviewSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "A decision and review reason are required.", 422, parsed.error.flatten());
  const { highlightId } = await context.params;
  const reviewed = await reviewHoleHighlight(highlightId, user!, parsed.data.status, parsed.data.reason).catch(() => false);
  return reviewed ? Response.json({ ok: true }) : apiError("NOT_FOUND", "The pending highlight was not found.", 404);
}
