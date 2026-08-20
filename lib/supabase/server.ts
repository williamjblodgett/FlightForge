import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfiguration } from "./config";

/**
 * Creates the request-scoped Supabase client used by route handlers and
 * dynamic server components. Cookie writes can be rejected while rendering a
 * Server Component; route handlers still persist refresh rotations normally.
 */
export async function createSupabaseServerClient() {
  const configuration = getSupabaseConfiguration();
  if (!configuration) return null;
  const cookieStore = await cookies();
  return createServerClient(configuration.url, configuration.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // A route-level refresh will persist the rotation. Never expose a
          // refresh token through a client-readable fallback.
        }
      },
    },
  });
}

export type SupabaseIdentity = {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  registrationNonce: string | null;
};

export async function getSupabaseIdentity(): Promise<SupabaseIdentity | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  const user = data.user;
  if (error || !user?.id || !user.email) return null;
  const displayName = typeof user.user_metadata?.display_name === "string"
    ? user.user_metadata.display_name.trim()
    : "";
  const registrationNonce = typeof user.user_metadata?.flightforge_registration_nonce === "string"
    ? user.user_metadata.flightforge_registration_nonce.trim()
    : "";
  return {
    id: user.id,
    email: user.email.toLowerCase(),
    displayName: displayName || user.email.split("@")[0] || "Player",
    emailVerified: Boolean(user.email_confirmed_at),
    registrationNonce: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(registrationNonce)
      ? registrationNonce
      : null,
  };
}
