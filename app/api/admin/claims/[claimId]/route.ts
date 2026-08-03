import { apiError } from "@/lib/http/api-response";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { reviewCourseClaim } from "@/modules/courses/course-repository";
import { claimReviewSchema } from "@/modules/courses/validation";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";

type RouteContext = { params: Promise<{ claimId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!isSameOriginMutation(request)) {
    return apiError("ORIGIN_REJECTED", "The review request origin was rejected.", 403);
  }
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to review claims.", 401);
  if (!can(user, "reviewCourseClaim")) {
    return apiError("FORBIDDEN", "Platform administrator access is required.", 403);
  }
  const rateLimit = await checkRateLimit("claim-review", user.email, 30, 60).catch(() => null);
  if (!rateLimit) return apiError("RATE_LIMIT_UNAVAILABLE", "Claim review is temporarily unavailable.", 503);
  if (!rateLimit.allowed) return apiError("RATE_LIMITED", "Too many review updates. Try again shortly.", 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "The request body must be valid JSON.", 400);
  }
  const parsed = claimReviewSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Choose a decision and provide a clear reason.",
      422,
      parsed.error.flatten(),
    );
  }

  const { claimId } = await params;
  const claim = await reviewCourseClaim(
    user,
    claimId,
    parsed.data.status,
    parsed.data.reason,
  );
  if (!claim) return apiError("CLAIM_NOT_FOUND", "That claim does not exist.", 404);
  return Response.json({ claim });
}
