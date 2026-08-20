import { cookies } from "next/headers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  ACCOUNT_SESSION_COOKIE,
  findAccountUserByEmail,
  findAccountUserByProviderSubject,
  getAccountUserBySession,
  resolveSupabaseAccount,
} from "./account-repository";
import { getSupabaseIdentity } from "@/lib/supabase/server";
import {
  DEMO_SESSION_COOKIE,
  getDemoSessionSecret,
  isDemoAuthEnabled,
  verifyDemoSessionToken,
} from "./demo-session";
import type { AuthenticatedUser, Role } from "./types";
import { rolesForConfiguredEmail } from "./configured-roles";

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const hasSupabaseSessionCookie = cookieStore.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
  const supabaseIdentity = await getSupabaseIdentity().catch(() => null);
  if (supabaseIdentity?.emailVerified) {
    return resolveSupabaseAccount({
      authUserId: supabaseIdentity.id,
      email: supabaseIdentity.email,
      displayName: supabaseIdentity.displayName,
      emailVerified: true,
      registrationNonce: supabaseIdentity.registrationNonce,
    }).catch(() => null);
  }
  // A hosted-auth cookie must never fall through to a different identity when
  // token validation, rotation, or provider availability fails.
  if (hasSupabaseSessionCookie) return null;

  const accountToken = cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value;
  if (accountToken) {
    const accountUser = await getAccountUserBySession(accountToken).catch(() => null);
    if (accountUser) return accountUser;
  }

  const chatGPTUser = await getChatGPTUser();
  if (chatGPTUser) {
    const persisted = await findAccountUserByProviderSubject(chatGPTUser.providerSubject).catch(() => null);
    const emailCollision = persisted ? null : await findAccountUserByEmail(chatGPTUser.email).catch(() => null);
    return {
      id: persisted?.id ?? `chatgpt:${chatGPTUser.providerSubject}`,
      email: chatGPTUser.email.toLowerCase(),
      displayName: persisted?.displayName ?? chatGPTUser.displayName,
      roles: mergeRoles(persisted?.roles ?? [], rolesForConfiguredEmail(chatGPTUser.email)),
      source: "chatgpt",
      onboardingComplete: persisted?.onboardingComplete ?? false,
      isTestAccount: false,
      mustChangePassword: persisted?.mustChangePassword ?? false,
      emailVerified: true,
      identityLinkRequired: Boolean(emailCollision),
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
