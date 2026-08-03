import { NextResponse } from "next/server";
import { apiError } from "@/lib/http/api-response";
import { DEMO_SESSION_COOKIE } from "@/modules/auth/demo-session";
import {
  ACCOUNT_SESSION_COOKIE,
  revokeAccountSession,
} from "@/modules/auth/account-repository";
import { isSameOriginMutation } from "@/lib/security/request-security";

export async function DELETE(request: Request) {
  if (!isSameOriginMutation(request)) {
    return apiError("ORIGIN_REJECTED", "The sign-out request origin was rejected.", 403);
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const accountToken = readCookie(cookieHeader, ACCOUNT_SESSION_COOKIE);
  if (accountToken) await revokeAccountSession(accountToken).catch(() => undefined);

  const response = NextResponse.json({ signedOut: true });
  for (const name of [ACCOUNT_SESSION_COOKIE, DEMO_SESSION_COOKIE]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}

function readCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}
