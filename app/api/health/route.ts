import { getD1Database, getPrivateMediaBucket } from "@/db/runtime";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  const startedAt = Date.now();
  const checks = { database: false, privateStorage: false };
  try {
    await getD1Database().prepare("SELECT 1 AS healthy").first();
    checks.database = true;
  } catch { /* Report a degraded check without exposing provider details. */ }
  try {
    checks.privateStorage = Boolean(getPrivateMediaBucket());
  } catch { /* Report a degraded check without exposing binding details. */ }

  const healthy = checks.database && checks.privateStorage;
  let supabaseConfigured = false;
  try { supabaseConfigured = isSupabaseConfigured(); } catch { /* Invalid configuration remains unavailable. */ }
  return Response.json({
    status: healthy ? "ok" : "degraded",
    service: "flightforge-web",
    releaseId: process.env.RELEASE_ID ?? "unknown",
    checks,
    supabaseConfigured,
    latencyMs: Date.now() - startedAt,
    checkedAt: new Date().toISOString(),
  }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store", "x-flightforge-release": process.env.RELEASE_ID ?? "unknown" } });
}
