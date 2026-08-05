import { apiError } from "@/lib/http/api-response";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { isFeatureEnabled } from "@/modules/config/feature-flags";
import { changeEventStatus, EventAccessError, EventConflictError, updateEvent } from "@/modules/events/event-repository";
import { eventEditorSchema, eventStatusActionSchema } from "@/modules/events/validation";

type RouteContext = { params: Promise<{ eventId: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  return mutateEvent(request, params, "UPDATE");
}

export async function PATCH(request: Request, { params }: RouteContext) {
  return mutateEvent(request, params, "STATUS");
}

async function mutateEvent(request: Request, params: RouteContext["params"], mode: "UPDATE" | "STATUS") {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The event request origin was rejected.", 403);
  if (!await isFeatureEnabled("event_publishing")) return apiError("FEATURE_DISABLED", "Event publishing is temporarily paused.", 503);
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in with a coordinator account.", 401);
  if (!can(user, "manageEvents")) return apiError("FORBIDDEN", "Verified event-coordinator access is required.", 403);
  const rateLimit = await checkRateLimit("event-update", user.email, 60, 3600).catch(() => null);
  if (!rateLimit) return apiError("RATE_LIMIT_UNAVAILABLE", "Event management is temporarily unavailable.", 503);
  if (!rateLimit.allowed) return apiError("RATE_LIMITED", "Too many event updates. Try again later.", 429);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "The request body must be valid JSON.", 400); }
  const { eventId } = await params;
  try {
    if (mode === "UPDATE") {
      const parsed = eventEditorSchema.safeParse(body);
      if (!parsed.success) return apiError("VALIDATION_ERROR", "Review the event details and try again.", 422, parsed.error.flatten());
      if (parsed.data.action === "PUBLISH" && !can(user, "publishEvents")) return apiError("FORBIDDEN", "Publishing access is required.", 403);
      const event = await updateEvent(user, eventId, parsed.data);
      return Response.json({ event, next: event.status === "PUBLISHED" ? `/events/${event.slug}` : "/events/manage" });
    }
    const parsed = eventStatusActionSchema.safeParse(body);
    if (!parsed.success) return apiError("VALIDATION_ERROR", "Choose a valid status action and provide a reason.", 422, parsed.error.flatten());
    if (parsed.data.action === "PUBLISH" && !can(user, "publishEvents")) return apiError("FORBIDDEN", "Publishing access is required.", 403);
    const event = await changeEventStatus(user, eventId, parsed.data);
    return Response.json({ event });
  } catch (error: unknown) {
    if (error instanceof EventAccessError) return apiError("FORBIDDEN", error.message, 403);
    if (error instanceof EventConflictError) return apiError("EVENT_CONFLICT", error.message, 409);
    return apiError("EVENT_UPDATE_FAILED", "The event could not be updated.", 503);
  }
}
