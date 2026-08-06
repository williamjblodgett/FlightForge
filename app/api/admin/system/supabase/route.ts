import { apiError } from "@/lib/http/api-response";
import { checkSupabaseReadiness } from "@/lib/supabase/admin";
import { getSupabaseConfiguration } from "@/lib/supabase/config";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to view database readiness.", 401);
  if (!can(user, "viewAdmin")) return apiError("FORBIDDEN", "Administrator access is required.", 403);
  const configuration = getSupabaseConfiguration();
  if (!configuration) return Response.json({ configured: false, ready: false, message: "Supabase URL and publishable key are not configured." });
  if (!configuration.serviceRoleKey) return Response.json({ configured: true, ready: false, message: "The server-only Supabase key is missing." });
  try { const result = await checkSupabaseReadiness(); return Response.json({ configured: true, ready: result.ok, ...result }); }
  catch { return apiError("SUPABASE_UNAVAILABLE", "Supabase readiness could not be verified.", 503); }
}
