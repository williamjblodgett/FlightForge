import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http/api-response";
import { findDemoUser } from "@/modules/auth/demo-users";
import {
  createDemoSessionToken,
  DEMO_SESSION_COOKIE,
  demoSessionMaxAge,
  getDemoSessionSecret,
  isDemoAuthEnabled,
} from "@/modules/auth/demo-session";
import {
  checkRateLimit,
  isSameOriginMutation,
  requestClientKey,
} from "@/lib/security/request-security";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return apiError("ORIGIN_REJECTED", "The sign-in request origin was rejected.", 403);
  }
  if (!isDemoAuthEnabled()) {
    return apiError("DEMO_AUTH_DISABLED", "Demo sign-in is not enabled.", 404);
  }
  const secret = getDemoSessionSecret();
  if (!secret) {
    return apiError(
      "DEMO_AUTH_MISCONFIGURED",
      "Demo sign-in is unavailable because its local secret is not configured.",
      503,
    );
  }

  try {
    const rateLimit = await checkRateLimit("demo-sign-in", requestClientKey(request), 10, 300);
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
  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Check the email and password fields.", 422);
  }

  const user = findDemoUser(parsed.data.email);
  if (!user || !constantTimeTextEqual(user.password, parsed.data.password)) {
    return apiError("INVALID_CREDENTIALS", "The email or password is incorrect.", 401);
  }

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles,
    },
  });
  response.cookies.set(
    DEMO_SESSION_COOKIE,
    await createDemoSessionToken(user, secret),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: demoSessionMaxAge(),
    },
  );
  return response;
}

export async function DELETE(request: Request) {
  if (!isSameOriginMutation(request)) {
    return apiError("ORIGIN_REJECTED", "The sign-out request origin was rejected.", 403);
  }
  const response = NextResponse.json({ signedOut: true });
  response.cookies.set(DEMO_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

function constantTimeTextEqual(left: string, right: string): boolean {
  const maxLength = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < maxLength; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}
