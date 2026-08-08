import { apiError } from "@/lib/http/api-response";
import {
  AccountEmailTakenError,
  createAccount,
  createEmailVerificationToken,
} from "@/modules/auth/account-repository";
import { isEmailVerificationDeliveryConfigured, sendEmailVerification } from "@/modules/notifications/email-verification";
import { isPublicRegistrationReady } from "@/config/public-launch";
import { signupSchema } from "@/modules/auth/account-validation";
import {
  checkRateLimit,
  isSameOriginMutation,
  requestClientKey,
} from "@/lib/security/request-security";
import { logError } from "@/lib/observability/logger";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return apiError("ORIGIN_REJECTED", "The sign-up request origin was rejected.", 403);
  }
  if (!isPublicRegistrationReady()) {
    return apiError("REGISTRATION_NOT_READY", "Public registration is paused until verified support, privacy, and email-delivery contacts are configured.", 503);
  }
  if (!isEmailVerificationDeliveryConfigured()) {
    return apiError("EMAIL_DELIVERY_NOT_READY", "Email verification is temporarily unavailable, so no account was created.", 503);
  }
  try {
    const rateLimit = await checkRateLimit("account-signup", requestClientKey(request), 5, 900);
    if (!rateLimit.allowed) {
      return apiError(
        "RATE_LIMITED",
        `Too many sign-up attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
        429,
      );
    }
  } catch {
    return apiError("AUTH_GUARD_UNAVAILABLE", "The sign-up guard is temporarily unavailable.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "The request body must be valid JSON.", 400);
  }
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Check the sign-up fields.",
      422,
    );
  }

  try {
    const user = await createAccount(parsed.data);
    const verificationToken = await createEmailVerificationToken(user.id);
    await sendEmailVerification({
      email: user.email,
      displayName: user.displayName,
      token: verificationToken,
      origin: new URL(request.url).origin,
    });
    return Response.json({
      user,
      next: "/verify-email",
      verificationToken: process.env.EMAIL_DELIVERY_MODE === "test" ? verificationToken : undefined,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AccountEmailTakenError) {
      return apiError("ACCOUNT_EXISTS", error.message, 409);
    }
    logError("account.signup.failed", error);
    return apiError("SIGNUP_FAILED", "The account could not be created right now.", 503);
  }
}

