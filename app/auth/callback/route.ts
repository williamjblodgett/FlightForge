import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authReturnPath, nextAuthDestination } from "@/modules/auth/continuation";
import {
  ACCOUNT_SESSION_COOKIE,
  resolveSupabaseAccount,
  createPasswordRecoveryIntent,
  PASSWORD_RECOVERY_INTENT_COOKIE,
  revokeAccountSession,
} from "@/modules/auth/account-repository";
import { DEMO_SESSION_COOKIE } from "@/modules/auth/demo-session";
import { isFreshRecoveryClaims } from "@/modules/auth/recovery-assurance";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = authReturnPath(url.searchParams.get("next"));
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.redirect(new URL("/sign-in?error=auth_unavailable", url.origin));

  let error: { message: string } | null = null;
  let recovery=false;
  if (code) {
    const flowId=url.searchParams.get("sb_flow_id");
    const exchanged=await supabase.auth.exchangeCodeForSession(code,flowId?{flowId}:undefined);
    error=exchanged.error;
    // Neither query parameters nor the browser-controlled PKCE redirectType
    // confer reset authority. Verify AMR on this exact newly exchanged token.
    if (!error && type === "recovery" && exchanged.data.session?.access_token && exchanged.data.user?.id) {
      const token = exchanged.data.session.access_token;
      const [verified, current] = await Promise.all([
        supabase.auth.getClaims(token).catch(() => null),
        supabase.auth.getUser(token).catch(() => null),
      ]);
      recovery = Boolean(verified?.data && !verified.error && current?.data.user && !current.error &&
        current.data.user.id === exchanged.data.user.id &&
        isFreshRecoveryClaims(verified.data.claims, current.data.user.id));
    }
    if(type==="recovery"&&!recovery)error={message:"This is not a recovery confirmation."};
  } else if (tokenHash && (type === "email" || type === "signup" || type === "recovery")) {
    ({ error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type === "email" ? "email" : type,
    }));
    recovery=!error&&type==="recovery";
  } else {
    error = { message: "Missing authentication confirmation." };
  }
  if (error) return NextResponse.redirect(new URL("/sign-in?error=invalid_confirmation&return_to="+encodeURIComponent(next), url.origin));
  let accountNext=next;
  if(!recovery){
    try{const {data}=await supabase.auth.getUser();const identity=data.user;
      if(!identity?.email||!identity.email_confirmed_at)throw Error("Unverified");
      const account=await resolveSupabaseAccount({authUserId:identity.id,email:identity.email,displayName:typeof identity.user_metadata?.display_name==="string"?identity.user_metadata.display_name:"Player",emailVerified:true,registrationNonce:typeof identity.user_metadata?.flightforge_registration_nonce==="string"?identity.user_metadata.flightforge_registration_nonce:null});
      accountNext=nextAuthDestination(account,next);
    }catch{return NextResponse.redirect(new URL("/sign-in?error=invalid_confirmation&return_to="+encodeURIComponent(next),url.origin));}
  }
  const destination = recovery
    ? `/account/update-password?return_to=${encodeURIComponent(next)}`
    : accountNext;
  const response = NextResponse.redirect(new URL(destination, url.origin), { headers: { "Cache-Control": "private, no-store" } });
  const legacyToken = readCookie(request.headers.get("cookie") ?? "", ACCOUNT_SESSION_COOKIE);
  if (legacyToken) await revokeAccountSession(legacyToken).catch(() => undefined);
  clearCookie(response, ACCOUNT_SESSION_COOKIE);
  clearCookie(response, DEMO_SESSION_COOKIE);

  if (recovery) {
    const { data } = await supabase.auth.getUser();
    if (!data.user?.id) return NextResponse.redirect(new URL("/sign-in?error=invalid_confirmation", url.origin));
    const recoveryIntent = await createPasswordRecoveryIntent(data.user.id);
    response.cookies.set(PASSWORD_RECOVERY_INTENT_COOKIE, recoveryIntent, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/auth/update-password",
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
