import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRelativeReturnPath } from "@/lib/http/safe-return-path";
import {
  ACCOUNT_SESSION_COOKIE,
  createPasswordRecoveryIntent,
  PASSWORD_RECOVERY_INTENT_COOKIE,
  revokeAccountSession,
} from "@/modules/auth/account-repository";
import { DEMO_SESSION_COOKIE } from "@/modules/auth/demo-session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeRelativeReturnPath(url.searchParams.get("next") || "/onboarding");
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.redirect(new URL("/sign-in?error=auth_unavailable", url.origin));

  let error: { message: string } | null = null;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && (type === "email" || type === "signup" || type === "recovery")) {
    ({ error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type === "email" ? "email" : type,
    }));
  } else {
    error = { message: "Missing authentication confirmation." };
  }
  if (error) return NextResponse.redirect(new URL("/sign-in?error=invalid_confirmation", url.origin));
  const destination = type === "recovery" ? "/account/update-password" : next;
  const response = NextResponse.redirect(new URL(destination, url.origin), { headers: { "Cache-Control": "private, no-store" } });
  const legacyToken = readCookie(request.headers.get("cookie") ?? "", ACCOUNT_SESSION_COOKIE);
  if (legacyToken) await revokeAccountSession(legacyToken).catch(() => undefined);
  clearCookie(response, ACCOUNT_SESSION_COOKIE);
  clearCookie(response, DEMO_SESSION_COOKIE);

  if (type === "recovery") {
    const { data } = await supabase.auth.getUser();
    if (!data.user?.id) return NextResponse.redirect(new URL("/sign-in?error=invalid_confirmation", url.origin));
    const recoveryIntent = await createPasswordRecoveryIntent(data.user.id);
    response.cookies.set(PASSWORD_RECOVERY_INTENT_COOKIE, recoveryIntent, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/account/update-password",
      maxAge: 15 * 60,
    });
  }
  return response;
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
