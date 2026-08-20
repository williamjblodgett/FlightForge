import { NextResponse } from "next/server";
import { apiError } from "@/lib/http/api-response";
import {
  ACCOUNT_SESSION_COOKIE,
  authenticateAccount,
  createAccountSession,
  EmailVerificationRequiredError,
  RegistrationConsentRequiredError,
  resolveSupabaseAccount,
  revokeAccountSession,
} from "@/modules/auth/account-repository";
import { DEMO_SESSION_COOKIE } from "@/modules/auth/demo-session";
import { loginSchema } from "@/modules/auth/account-validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
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
    const accountLimit = await checkRateLimit(
      "account-signin-email",
      parsed.data.email,
      12,
      900,
    );
    if (!accountLimit.allowed) {
      return apiError(
        "RATE_LIMITED",
        `Too many sign-in attempts. Try again in ${accountLimit.retryAfterSeconds} seconds.`,
        429,
      );
    }
  } catch {
    return apiError("AUTH_GUARD_UNAVAILABLE", "The sign-in guard is temporarily unavailable.", 503);
  }

  try {
    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      if (!supabase) throw new Error("Supabase authentication is unavailable.");
      const { data, error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error || !data.user?.email) {
        // During the verified migration window, existing D1 accounts (including
        // the forced-change tester account) remain usable until each person
        // explicitly links a Supabase identity.
        const legacyUser = await authenticateAccount(parsed.data.email, parsed.data.password).catch(() => null);
        if (legacyUser) {
          await supabase.auth.signOut().catch(() => undefined);
          const session = await createAccountSession(legacyUser.id, request.headers.get("user-agent"));
          const response = NextResponse.json({
            user: legacyUser,
            next: legacyUser.mustChangePassword ? "/account/password" : legacyUser.onboardingComplete ? "/profile" : "/onboarding",
          });
          response.cookies.set(ACCOUNT_SESSION_COOKIE, session.token, {
            httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: session.maxAge,
          });
          clearCookie(response, DEMO_SESSION_COOKIE);
          return response;
        }
        if (/confirm|verified/iu.test(error?.message ?? "")) return apiError("EMAIL_VERIFICATION_REQUIRED", "Verify your email address before signing in.", 403);
        return apiError("INVALID_CREDENTIALS", "The email or password is incorrect.", 401);
      }
      if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        return apiError("EMAIL_VERIFICATION_REQUIRED", "Verify your email address before signing in.", 403);
      }
      const user = await resolveSupabaseAccount({
        authUserId: data.user.id,
        email: data.user.email,
        displayName: typeof data.user.user_metadata?.display_name === "string"
          ? data.user.user_metadata.display_name
          : data.user.email.split("@")[0] || "Player",
        emailVerified: true,
        registrationNonce: typeof data.user.user_metadata?.flightforge_registration_nonce === "string"
          ? data.user.user_metadata.flightforge_registration_nonce
          : null,
      });
      const response = NextResponse.json({
        user,
        next: user.identityLinkRequired
          ? "/account/link"
          : user.onboardingComplete ? "/profile" : "/onboarding",
      }, { headers: { "Cache-Control": "private, no-store" } });
      const legacyToken = readCookie(request.headers.get("cookie") ?? "", ACCOUNT_SESSION_COOKIE);
      if (legacyToken) await revokeAccountSession(legacyToken).catch(() => undefined);
      clearCookie(response, ACCOUNT_SESSION_COOKIE);
      clearCookie(response, DEMO_SESSION_COOKIE);
      return response;
    }
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
    clearCookie(response, DEMO_SESSION_COOKIE);
    return response;
  } catch (error) {
    if (error instanceof EmailVerificationRequiredError) {
      return apiError("EMAIL_VERIFICATION_REQUIRED", error.message, 403);
    }
    if (error instanceof RegistrationConsentRequiredError) {
      return apiError("REGISTRATION_CONSENT_REQUIRED", error.message, 403);
    }
    return apiError("SIGNIN_FAILED", "The sign-in service is temporarily unavailable.", 503);
  }
}

function clearCookie(response: NextResponse, name: string) {
  response.cookies.set(name, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

function readCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}
