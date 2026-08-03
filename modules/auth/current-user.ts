import { cookies } from "next/headers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  DEMO_SESSION_COOKIE,
  getDemoSessionSecret,
  isDemoAuthEnabled,
  verifyDemoSessionToken,
} from "./demo-session";
import type { AuthenticatedUser, Role } from "./types";

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const chatGPTUser = await getChatGPTUser();
  if (chatGPTUser) {
    return {
      id: `chatgpt:${chatGPTUser.email.toLowerCase()}`,
      email: chatGPTUser.email.toLowerCase(),
      displayName: chatGPTUser.displayName,
      roles: rolesForHostedEmail(chatGPTUser.email),
      source: "chatgpt",
    };
  }

  if (!isDemoAuthEnabled()) return null;
  const secret = getDemoSessionSecret();
  if (!secret) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(DEMO_SESSION_COOKIE)?.value;
  return token ? verifyDemoSessionToken(token, secret) : null;
}

function rolesForHostedEmail(email: string): Role[] {
  const normalized = email.toLowerCase();
  const roles: Role[] = ["PLAYER"];
  if (emailList("COURSE_OWNER_EMAILS").has(normalized)) roles.push("COURSE_OWNER");
  if (emailList("PLATFORM_ADMIN_EMAILS").has(normalized)) roles.push("PLATFORM_ADMIN");
  return roles;
}

function emailList(variableName: string): Set<string> {
  return new Set(
    (process.env[variableName] ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}
