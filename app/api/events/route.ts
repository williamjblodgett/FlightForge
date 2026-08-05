import { apiError } from "@/lib/http/api-response";
import { checkRateLimit, isSameOriginMutation, requestClientKey } from "@/lib/security/request-security";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { isFeatureEnabled } from "@/modules/config/feature-flags";
import { createEvent, listPublishedEvents } from "@/modules/events/event-repository";
import { eventEditorSchema } from "@/modules/events/validation";

export async function GET() {
  const events = await listPublishedEvents().catch(() => []);
  return Response.json({ events });
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The event request origin was rejected.", 403);
  if (!await isFeatureEnabled("event_publishing")) return apiError("FEATURE_DISABLED", "Event publishing is temporarily paused.", 503);
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in with a coordinator account to create an event.", 401);
  if (!can(user, "manageEvents")) return apiError("FORBIDDEN", "Verified event-coordinator access is required.", 403);
  const rateLimit = await checkRateLimit("event-create", user.email || requestClientKey(request), 20, 3600).catch(() => null);
  if (!rateLimit) return apiError("RATE_LIMIT_UNAVAILABLE", "Event publishing is temporarily unavailable.", 503);
  if (!rateLimit.allowed) return apiError("RATE_LIMITED", "Too many event submissions. Try again later.", 429);
  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 100) {
    return apiError("IDEMPOTENCY_KEY_REQUIRED", "A valid idempotency key is required.", 400);
  }
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "The request body must be valid JSON.", 400); }
  const parsed = eventEditorSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Review the event details and try again.", 422, parsed.error.flatten());
  if (parsed.data.action === "PUBLISH" && !can(user, "publishEvents")) {
    return apiError("FORBIDDEN", "Your account can save drafts but cannot publish events.", 403);
  }
  try {
    const event = await createEvent(user, parsed.data, idempotencyKey);
    return Response.json({ event, next: event.status === "PUBLISHED" ? `/events/${event.slug}` : "/events/manage" }, { status: 201 });
  } catch {
    return apiError("EVENT_SAVE_FAILED", "The event could not be saved. No duplicate event was published.", 503);
  }
}
