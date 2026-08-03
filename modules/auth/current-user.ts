import { cookies } from "next/headers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  ACCOUNT_SESSION_COOKIE,
  findAccountUserByEmail,
  getAccountUserBySession,
} from "./account-repository";
import {
  DEMO_SESSION_COOKIE,
  getDemoSessionSecret,
  isDemoAuthEnabled,
  verifyDemoSessionToken,
} from "./demo-session";
import type { AuthenticatedUser, Role } from "./types";

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const accountToken = cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value;
  if (accountToken) {
    const accountUser = await getAccountUserBySession(accountToken).catch(() => null);
    if (accountUser) return accountUser;
  }

  const chatGPTUser = await getChatGPTUser();
  if (chatGPTUser) {
    const persisted = await findAccountUserByEmail(chatGPTUser.email).catch(() => null);
    return {
      id: persisted?.id ?? `chatgpt:${chatGPTUser.email.toLowerCase()}`,
      email: chatGPTUser.email.toLowerCase(),
      displayName: persisted?.displayName ?? chatGPTUser.displayName,
      roles: mergeRoles(persisted?.roles ?? [], rolesForHostedEmail(chatGPTUser.email)),
      source: "chatgpt",
      onboardingComplete: persisted?.onboardingComplete ?? false,
      isTestAccount: false,
    };
  }

  if (!isDemoAuthEnabled()) return null;
  const secret = getDemoSessionSecret();
  if (!secret) return null;
  const token = cookieStore.get(DEMO_SESSION_COOKIE)?.value;
  return token ? verifyDemoSessionToken(token, secret) : null;
}

function mergeRoles(first: Role[], second: Role[]): Role[] {
  return Array.from(new Set([...first, ...second]));
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
