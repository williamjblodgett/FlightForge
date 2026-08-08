import { NextResponse } from "next/server";
import { apiError } from "@/lib/http/api-response";
import { ACCOUNT_SESSION_COOKIE, createAccountSession, verifyAccountEmail } from "@/modules/auth/account-repository";
import { isSameOriginMutation } from "@/lib/security/request-security";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The verification origin was rejected.", 403);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "The request body must be valid JSON.", 400); }
  const token = typeof body === "object" && body && "token" in body ? String(body.token) : "";
  if (!/^[A-Za-z0-9_-]{32,128}$/u.test(token)) return apiError("INVALID_TOKEN", "This verification link is invalid or expired.", 422);
  const user = await verifyAccountEmail(token);
  if (!user) return apiError("INVALID_TOKEN", "This verification link is invalid or expired.", 422);
  const session = await createAccountSession(user.id, request.headers.get("user-agent"));
  const response = NextResponse.json({ user, next: "/onboarding" });
  response.cookies.set(ACCOUNT_SESSION_COOKIE, session.token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: session.maxAge,
  });
  return response;
}
