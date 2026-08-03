import { NextResponse } from "next/server";
import { apiError } from "@/lib/http/api-response";
import {
  ACCOUNT_SESSION_COOKIE,
  authenticateAccount,
  createAccountSession,
} from "@/modules/auth/account-repository";
import { loginSchema } from "@/modules/auth/account-validation";
import {
  checkRateLimit,
  isSameOriginMutation,
  requestClientKey,
} from "@/lib/security/request-security";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return apiError("ORIGIN_REJECTED", "The sign-in request origin was rejected.", 403);
  }
  try {
    const rateLimit = await checkRateLimit("account-signin", requestClientKey(request), 10, 300);
    if (!rateLimit.allowed) {
      return apiError(
        "RATE_LIMITED",
        `Too many sign-in attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
        429,
      );
    }
  } catch {
    return apiError("AUTH_GUARD_UNAVAILABLE", "The sign-in guard is temporarily unavailable.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "The request body must be valid JSON.", 400);
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Check the email and password fields.", 422);
  }

  try {
    const user = await authenticateAccount(parsed.data.email, parsed.data.password);
    if (!user) return apiError("INVALID_CREDENTIALS", "The email or password is incorrect.", 401);
    const session = await createAccountSession(user.id, request.headers.get("user-agent"));
    const response = NextResponse.json({
      user,
      next: user.mustChangePassword
        ? "/account/password"
        : user.onboardingComplete
          ? "/profile"
          : "/onboarding",
    });
    response.cookies.set(ACCOUNT_SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: session.maxAge,
    });
    return response;
  } catch {
    return apiError("SIGNIN_FAILED", "The sign-in service is temporarily unavailable.", 503);
  }
}
