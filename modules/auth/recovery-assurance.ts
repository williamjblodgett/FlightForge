import { getSupabaseConfiguration } from "@/lib/supabase/config";

/** Only claims returned by auth.getClaims(exchangedAccessToken) are trusted.
 * SDK redirectType comes from the browser's PKCE cookie, not the Auth server.
 * A freshly exchanged recovery session has a fresh server-recorded recovery AMR.
 */
export function isFreshRecoveryClaims(claims: Record<string, unknown>, userId: string, now = Date.now()): boolean {
  const configuration = getSupabaseConfiguration();
  if (!configuration) return false;
  const seconds = Math.floor(now / 1000);
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== `${configuration.url.replace(/\/$/u, "")}/auth/v1` ||
      claims.sub !== userId || claims.role !== "authenticated" || !audiences.includes("authenticated") ||
      typeof claims.session_id !== "string" || !claims.session_id ||
      typeof claims.exp !== "number" || claims.exp <= seconds ||
      typeof claims.iat !== "number" || claims.iat < seconds - 120 || claims.iat > seconds + 60) return false;
  if (!Array.isArray(claims.amr)) return false;
  return claims.amr.some((entry: unknown) => typeof entry === "object" && entry !== null && "method" in entry && entry.method === "recovery" &&
    "timestamp" in entry && typeof entry.timestamp === "number" &&
    Number.isInteger(entry.timestamp) && entry.timestamp >= seconds - 120 && entry.timestamp <= seconds + 60);
}
