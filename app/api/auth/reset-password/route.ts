import { apiError } from "@/lib/http/api-response";
import { safeRelativeReturnPath } from "@/lib/http/safe-return-path";
import { checkRateLimit, isSameOriginMutation, requestClientKey } from "@/lib/security/request-security";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The recovery request origin was rejected.", 403);
  if (!isSupabaseConfigured()) return apiError("RECOVERY_NOT_READY", "Password recovery is not configured yet.", 503);
  const limit = await checkRateLimit("password-recovery", requestClientKey(request), 5, 900).catch(() => null);
  if (!limit?.allowed) return apiError("RATE_LIMITED", "Too many recovery requests. Try again later.", 429);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "The request body must be valid JSON.", 400); }
  const email = typeof body === "object" && body && "email" in body ? String(body.email).trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) || email.length > 254) {
    return apiError("VALIDATION_ERROR", "Enter a valid email address.", 422);
  }
  const returnTo = typeof body === "object" && body && "returnTo" in body
    ? safeRelativeReturnPath(String(body.returnTo))
    : "/";
  const supabase = await createSupabaseServerClient();
  if (!supabase) return apiError("RECOVERY_NOT_READY", "Password recovery is not configured yet.", 503);
  const origin = new URL(request.url).origin;
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?type=recovery&next=${encodeURIComponent(returnTo)}`,
  });
  // Always return the same response so callers cannot enumerate accounts.
  return Response.json({ accepted: true });
}
