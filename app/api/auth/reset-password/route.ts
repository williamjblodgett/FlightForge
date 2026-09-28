import { apiError } from "@/lib/http/api-response";
import { safeRelativeReturnPath } from "@/lib/http/safe-return-path";
import { checkRateLimit, isSameOriginMutation, requestClientKey } from "@/lib/security/request-security";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { recoveryResponseStatus } from "@/modules/auth/recovery-provider-result";
import { logError } from "@/lib/observability/logger";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The recovery request origin was rejected.", 403);
  if (!isSupabaseConfigured()) return apiError("RECOVERY_NOT_READY", "Password recovery is not configured yet.", 503);
  const limit = await checkRateLimit("password-recovery", requestClientKey(request), 5, 900).catch(() => null);
  if (!limit) return apiError("RECOVERY_UNAVAILABLE", "Recovery is temporarily unavailable. Please try again later.", 503);
  if (!limit.allowed) return apiError("RATE_LIMITED", "Too many recovery requests. Try again later.", 429);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "The request body must be valid JSON.", 400); }
  const email = typeof body === "object" && body && "email" in body ? String(body.email).trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) || email.length > 254) {
    return apiError("VALIDATION_ERROR", "Enter a valid email address.", 422);
  }
  const returnTo = typeof body === "object" && body && "returnTo" in body
    ? safeRelativeReturnPath(String(body.returnTo))
    : "/";
  try {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return apiError("RECOVERY_NOT_READY", "Password recovery is not configured yet.", 503);
  const origin = new URL(request.url).origin;
  const {error} = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?type=recovery&next=${encodeURIComponent(returnTo)}`,
  });
  const status = recoveryResponseStatus(error);
  if (status === 429) return apiError("RATE_LIMITED", "Too many recovery requests. Try again later.", 429);
  if (status === 503) {
    logError("auth.recovery_unavailable",new Error("Recovery provider unavailable"),{providerCode:error?.code ?? "unknown"});
    return apiError("RECOVERY_UNAVAILABLE", "Recovery is temporarily unavailable. Please try again later.", 503);
  }
  return Response.json({ accepted: true },{headers:{"Cache-Control":"private, no-store"}});
  } catch {
    logError("auth.recovery_unavailable",new Error("Recovery provider request failed"));
    return apiError("RECOVERY_UNAVAILABLE", "Recovery is temporarily unavailable. Please try again later.", 503);
  }
}
