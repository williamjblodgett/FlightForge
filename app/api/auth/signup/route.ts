import { NextResponse } from "next/server";
import { apiError } from "@/lib/http/api-response";
import {
  AccountEmailTakenError,
  ACCOUNT_SESSION_COOKIE,
  createAccount,
  createAccountSession,
} from "@/modules/auth/account-repository";
import { signupSchema } from "@/modules/auth/account-validation";
import {
  checkRateLimit,
  isSameOriginMutation,
  requestClientKey,
} from "@/lib/security/request-security";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return apiError("ORIGIN_REJECTED", "The sign-up request origin was rejected.", 403);
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
    const session = await createAccountSession(user.id, request.headers.get("user-agent"));
    const response = NextResponse.json({ user, next: "/onboarding" }, { status: 201 });
    response.cookies.set(ACCOUNT_SESSION_COOKIE, session.token, sessionCookie(session.maxAge));
    return response;
  } catch (error) {
    if (error instanceof AccountEmailTakenError) {
      return apiError("ACCOUNT_EXISTS", error.message, 409);
    }
    return apiError("SIGNUP_FAILED", "The account could not be created right now.", 503);
  }
}

function sessionCookie(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

