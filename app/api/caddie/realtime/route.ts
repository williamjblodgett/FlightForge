import { apiError } from "@/lib/http/api-response";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { getAccountSettings } from "@/modules/auth/account-repository";
import { getCurrentUser } from "@/modules/auth/current-user";
import { buildRealtimeInstructions } from "@/modules/ai-caddie/chat-repository";
import { realtimeSdpSchema } from "@/modules/ai-caddie/chat-validation";
import { isFeatureEnabled } from "@/modules/config/feature-flags";
import { isOpenAIProviderConfigured, openAIApiKey } from "@/packages/ai/src/provider-config";

export async function GET() {
  const user = await getCurrentUser();
  return Response.json({ available: Boolean(user && isOpenAIProviderConfigured()), model: process.env.AI_REALTIME_MODEL ?? "gpt-realtime-2.1" });
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The voice request origin was rejected.", 403);
  if (!await isFeatureEnabled("ai_caddie")) return apiError("FEATURE_DISABLED", "The caddie is temporarily paused.", 503);
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to use voice caddie.", 401);
  const settings = await getAccountSettings(user).catch(() => null);
  if (!settings?.aiRecommendations) return apiError("CADDIE_DISABLED", "Enable recommendations in Profile & privacy before using voice caddie.", 403);
  const apiKey = openAIApiKey();
  if (!apiKey || !isOpenAIProviderConfigured()) return apiError("VOICE_NOT_CONFIGURED", "Live AI voice is not configured. Text caddie remains available.", 503);
  const rateLimit = await checkRateLimit("caddie-realtime", user.email, 12, 3600).catch(() => null);
  if (!rateLimit?.allowed) return apiError(rateLimit ? "RATE_LIMITED" : "RATE_LIMIT_UNAVAILABLE", "Voice sessions are temporarily limited.", rateLimit ? 429 : 503);
  const parsed = realtimeSdpSchema.safeParse(await request.text());
  if (!parsed.success) return apiError("INVALID_SDP", "The voice connection offer is invalid.", 422);
  const { instructions, safetyIdentifier } = await buildRealtimeInstructions(user);
  const session = JSON.stringify({
    type: "realtime",
    model: process.env.AI_REALTIME_MODEL ?? "gpt-realtime-2.1",
    instructions,
    audio: { input: { turn_detection: null }, output: { voice: process.env.AI_REALTIME_VOICE ?? "marin" } },
  });
  const form = new FormData();
  form.set("sdp", parsed.data);
  form.set("session", session);
  try {
    const response = await fetch("https://api.openai.com/v1/realtime/calls", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "OpenAI-Safety-Identifier": safetyIdentifier }, body: form });
    const payload = await response.text();
    if (!response.ok) return apiError("VOICE_PROVIDER_ERROR", "The live voice provider could not start a session.", 502);
    return new Response(payload, { status: 200, headers: { "content-type": "application/sdp", "cache-control": "no-store" } });
  } catch {
    return apiError("VOICE_PROVIDER_UNAVAILABLE", "The live voice provider could not be reached.", 503);
  }
}
