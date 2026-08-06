import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfiguration } from "./config";

export function createSupabaseAdminClient() {
  const configuration = getSupabaseConfiguration();
  if (!configuration?.serviceRoleKey) throw new Error("Supabase server credentials are not configured.");
  return createClient(configuration.url, configuration.serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }, global: { headers: { "X-Client-Info": "flightforge-server" } } });
}
export async function checkSupabaseReadiness() {
  const started = Date.now();
  const { count, error } = await createSupabaseAdminClient().from("courses").select("id", { count: "exact", head: true });
  return { ok: !error, latencyMs: Date.now() - started, courseCount: count ?? null, errorCode: error?.code ?? null };
}
