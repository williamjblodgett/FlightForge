import { apiError } from "@/lib/http/api-response";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { getAccountSettings } from "@/modules/auth/account-repository";
import { getCurrentUser } from "@/modules/auth/current-user";
import { isFeatureEnabled } from "@/modules/config/feature-flags";
import { listCaddieMessages, sendCaddieMessage } from "@/modules/ai-caddie/chat-repository";
import { caddieChatSchema } from "@/modules/ai-caddie/chat-validation";

export async function GET(request: Request) {
  if (!await isFeatureEnabled("ai_caddie")) return apiError("FEATURE_DISABLED", "The caddie is temporarily paused.", 503);
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to chat with your caddie.", 401);
  const conversationId = new URL(request.url).searchParams.get("conversationId");
  try { return Response.json(await listCaddieMessages(user, conversationId)); }
  catch { return apiError("CADDIE_HISTORY_UNAVAILABLE", "Caddie history could not be loaded.", 503); }
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The caddie request origin was rejected.", 403);
  if (!await isFeatureEnabled("ai_caddie")) return apiError("FEATURE_DISABLED", "The caddie is temporarily paused.", 503);
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to chat with your caddie.", 401);
  const settings = await getAccountSettings(user).catch(() => null);
  if (!settings?.aiRecommendations) return apiError("CADDIE_DISABLED", "Enable recommendations in Profile & privacy before using the caddie.", 403);
  const rateLimit = await checkRateLimit("caddie-chat", user.email, 90, 3600).catch(() => null);
  if (!rateLimit?.allowed) return apiError(rateLimit ? "RATE_LIMITED" : "RATE_LIMIT_UNAVAILABLE", "Caddie chat is temporarily limited. Try again later.", rateLimit ? 429 : 503);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "The request body must be valid JSON.", 400); }
  const parsed = caddieChatSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Enter a question between 2 and 1,200 characters.", 422, parsed.error.flatten());
  try { return Response.json(await sendCaddieMessage(user, parsed.data.message, parsed.data.conversationId), { status: 201 }); }
  catch { return apiError("CADDIE_UNAVAILABLE", "The caddie could not answer right now. Your bag and prior chat are safe.", 503); }
}
