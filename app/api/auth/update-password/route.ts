import { NextResponse } from "next/server";
import { apiError } from "@/lib/http/api-response";
import {
  checkRateLimit,
  isSameOriginMutation,
} from "@/lib/security/request-security";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  consumePasswordRecoveryIntent,
  PASSWORD_RECOVERY_INTENT_COOKIE,
} from "@/modules/auth/account-repository";
import { validatePasswordStrength } from "@/modules/auth/password";
import { safeRelativeReturnPath } from "@/lib/http/safe-return-path";

export async function PUT(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The password request origin was rejected.", 403);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "The request body must be valid JSON.", 400); }
  const password = typeof body === "object" && body && "password" in body ? String(body.password) : "";
  const confirmation = typeof body === "object" && body && "confirmation" in body ? String(body.confirmation) : "";
  const returnTo = typeof body === "object" && body && "returnTo" in body
    ? safeRelativeReturnPath(String(body.returnTo))
    : "/profile";
  const strengthIssue = validatePasswordStrength(password);
  if (strengthIssue) return apiError("VALIDATION_ERROR", strengthIssue, 422);
  if (password !== confirmation) return apiError("VALIDATION_ERROR", "Passwords do not match.", 422);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return apiError("RECOVERY_NOT_READY", "Password recovery is not configured yet.", 503);
  const { data: current } = await supabase.auth.getUser();
  if (!current.user) return apiError("AUTH_REQUIRED", "Open the current recovery link before changing your password.", 401);
  try {
    const rateLimit = await checkRateLimit("password-recovery-update", current.user.id, 5, 900);
    if (!rateLimit.allowed) {
      return apiError("RATE_LIMITED", `Too many password attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`, 429);
    }
  } catch {
    return apiError("AUTH_GUARD_UNAVAILABLE", "The password security check is temporarily unavailable.", 503);
  }
  const recoveryIntent = readCookie(request.headers.get("cookie") ?? "", PASSWORD_RECOVERY_INTENT_COOKIE);
  if (!recoveryIntent || !await consumePasswordRecoveryIntent({ token: recoveryIntent, authUserId: current.user.id })) {
    return apiError("RECOVERY_INTENT_REQUIRED", "This recovery link is missing, expired, or already used. Request a new one.", 403);
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return apiError("PASSWORD_UPDATE_FAILED", "The password could not be updated. Request a new recovery link.", 422);
  const response = NextResponse.json({ updated: true, next: returnTo });
  response.cookies.set(PASSWORD_RECOVERY_INTENT_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/account/update-password",
    maxAge: 0,
  });
  return response;
}

function readCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}
