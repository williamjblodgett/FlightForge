import { NextResponse } from "next/server";
import { apiError } from "@/lib/http/api-response";
import {
  ACCOUNT_SESSION_COOKIE,
  changeAccountPassword,
  createAccountSession,
  InvalidCurrentPasswordError,
} from "@/modules/auth/account-repository";
import { passwordChangeSchema } from "@/modules/auth/account-validation";
import { getCurrentUser } from "@/modules/auth/current-user";
import { checkRateLimit, isSameOriginMutation, requestClientKey } from "@/lib/security/request-security";

export async function PUT(request: Request) {
  if (!isSameOriginMutation(request)) {
    return apiError("ORIGIN_REJECTED", "The password request origin was rejected.", 403);
  }
  const user = await getCurrentUser();
  if (!user || user.source !== "password") {
    return apiError("AUTHENTICATION_REQUIRED", "Sign in with a password account first.", 401);
  }
  try {
    const limit = await checkRateLimit("account-password", `${user.id}:${requestClientKey(request)}`, 6, 900);
    if (!limit.allowed) {
      return apiError("RATE_LIMITED", `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.`, 429);
    }
  } catch {
    return apiError("AUTH_GUARD_UNAVAILABLE", "The account guard is temporarily unavailable.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "The request body must be valid JSON.", 400);
  }
  const parsed = passwordChangeSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Check the password fields.", 422);
  }

  try {
    await changeAccountPassword(user.id, parsed.data.currentPassword, parsed.data.newPassword);
    const session = await createAccountSession(user.id, request.headers.get("user-agent"));
    const response = NextResponse.json({ next: user.onboardingComplete ? "/profile" : "/onboarding" });
    response.cookies.set(ACCOUNT_SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: session.maxAge,
    });
    return response;
  } catch (error) {
    if (error instanceof InvalidCurrentPasswordError) {
      return apiError("INVALID_CURRENT_PASSWORD", "The current password is incorrect.", 401);
    }
    return apiError("PASSWORD_CHANGE_FAILED", "The password could not be changed.", 503);
  }
}
