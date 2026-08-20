import { apiError } from "@/lib/http/api-response";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { InvalidCurrentPasswordError, linkHostedIdentity } from "@/modules/auth/account-repository";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { getSupabaseIdentity } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The account-linking origin was rejected.", 403);
  const chatGPT = await getChatGPTUser();
  const supabase = chatGPT ? null : await getSupabaseIdentity().catch(() => null);
  const hosted = chatGPT
    ? { email: chatGPT.email, providerSubject: chatGPT.providerSubject }
    : supabase?.emailVerified
      ? { email: supabase.email, providerSubject: `supabase:${supabase.id}` }
      : null;
  if (!hosted) return apiError("HOSTED_IDENTITY_REQUIRED", "Continue with hosted identity before linking an account.", 401);
  const limit = await checkRateLimit("hosted-identity-link", hosted.providerSubject, 5, 900).catch(() => null);
  if (!limit?.allowed) return apiError("RATE_LIMITED", "Too many account-linking attempts. Try again later.", 429);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "The request body must be valid JSON.", 400); }
  const password = typeof body === "object" && body && "password" in body ? String(body.password) : "";
  if (password.length < 12 || password.length > 128) return apiError("VALIDATION_ERROR", "Enter the password for the existing FlightForge account.", 422);
  try {
    const user = await linkHostedIdentity({ email: hosted.email, providerSubject: hosted.providerSubject, password });
    return Response.json({ user, next: user.onboardingComplete ? "/profile" : "/onboarding" });
  } catch (error) {
    if (error instanceof InvalidCurrentPasswordError) return apiError("INVALID_CREDENTIALS", "The existing account password is incorrect.", 401);
    return apiError("LINK_FAILED", "The hosted identity could not be linked safely.", 409);
  }
}
