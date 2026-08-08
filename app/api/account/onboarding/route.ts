import { NextResponse } from "next/server";
import { apiError } from "@/lib/http/api-response";
import { getCurrentUser } from "@/modules/auth/current-user";
import { onboardingSchema } from "@/modules/auth/account-validation";
import { PasswordChangeRequiredError, saveOnboarding } from "@/modules/auth/account-repository";
import {
  checkRateLimit,
  isSameOriginMutation,
  requestClientKey,
} from "@/lib/security/request-security";
import { logError } from "@/lib/observability/logger";

export async function PUT(request: Request) {
  if (!isSameOriginMutation(request)) {
    return apiError("ORIGIN_REJECTED", "The profile request origin was rejected.", 403);
  }
  const user = await getCurrentUser();
  if (!user) return apiError("AUTH_REQUIRED", "Sign in to update your profile.", 401);

  try {
    const rateLimit = await checkRateLimit("profile-update", requestClientKey(request), 20, 300);
    if (!rateLimit.allowed) {
      return apiError("RATE_LIMITED", "Too many profile updates. Try again shortly.", 429);
    }
  } catch {
    return apiError("PROFILE_GUARD_UNAVAILABLE", "Profile protection is temporarily unavailable.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "The request body must be valid JSON.", 400);
  }
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Check the profile fields.",
      422,
    );
  }

  try {
    await saveOnboarding(user, parsed.data);
    return NextResponse.json({ saved: true, next: "/profile" });
  } catch (error) {
    if (error instanceof PasswordChangeRequiredError) {
      return apiError("PASSWORD_CHANGE_REQUIRED", error.message, 409);
    }
    logError("account.onboarding.save.failed", error, { userId: user.id });
    return apiError("PROFILE_SAVE_FAILED", "Your changes could not be saved right now.", 503);
  }
}
