import { apiError } from "@/lib/http/api-response";
import { getCurrentUser } from "@/modules/auth/current-user";
import { getPublishedEventById } from "@/modules/events/event-repository";
import {
  completeActiveRound,
  getOrCreateActiveRound,
  RoundConflictError,
  RoundIncompleteError,
  RoundUnavailableError,
  saveHoleScore,
} from "@/modules/rounds/round-repository";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { z } from "zod";

const mutationSchema = z.object({
  eventId: z.string().trim().min(3).max(120).regex(/^[a-zA-Z0-9:_-]+$/u),
  holeNumber: z.number().int().min(1).max(36),
  strokes: z.number().int().min(1).max(99),
  penalties: z.number().int().min(0).max(20),
  clientMutationId: z.uuid(),
  expectedVersion: z.number().int().min(1).optional(),
});

const completionSchema = z.object({
  eventId: z.string().trim().min(3).max(120).regex(/^[a-zA-Z0-9:_-]+$/u),
  roundId: z.uuid(),
  clientMutationId: z.uuid(),
  expectedVersion: z.number().int().min(1),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to synchronize this round.", 401);
  const event = await getPublishedEventById(new URL(request.url).searchParams.get("eventId") ?? "");
  if (!event) return apiError("EVENT_NOT_FOUND", "The active event could not be loaded.", 404);
  try { return Response.json({ round: await getOrCreateActiveRound(user, event) }); }
  catch { return apiError("ROUND_UNAVAILABLE", "The scorecard could not be loaded.", 503); }
}

export async function PUT(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The score update origin was rejected.", 403);
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to synchronize this round.", 401);
  const limit = await checkRateLimit("round-score", user.id, 240, 3600).catch(() => null);
  if (!limit?.allowed) return apiError("RATE_LIMITED", "Too many score updates. Try again shortly.", 429);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "The request body must be valid JSON.", 400); }
  const parsed = mutationSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Review the hole score and penalties.", 422, parsed.error.flatten());
  const event = await getPublishedEventById(parsed.data.eventId);
  if (!event) return apiError("EVENT_NOT_FOUND", "The active event could not be loaded.", 404);
  try { return Response.json({ round: await saveHoleScore(user, event, parsed.data) }); }
  catch (error) {
    if (error instanceof RoundConflictError) {
      return Response.json({
        error: { code: "ROUND_VERSION_CONFLICT", message: "This round changed on another device. Your local score is still safe." },
        round: error.round,
      }, { status: 409 });
    }
    return apiError("SCORE_SAVE_FAILED", "The score remains on this device and will retry when synchronization is available.", 503);
  }
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The round completion origin was rejected.", 403);
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to finish and save this round.", 401);
  const limit = await checkRateLimit("round-complete", user.id, 12, 3600).catch(() => null);
  if (!limit?.allowed) return apiError("RATE_LIMITED", "Too many round completion attempts. Try again shortly.", 429);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "The request body must be valid JSON.", 400); }
  const parsed = completionSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "The round completion request is invalid.", 422, parsed.error.flatten());
  const event = await getPublishedEventById(parsed.data.eventId);
  if (!event) return apiError("EVENT_NOT_FOUND", "The active event could not be loaded.", 404);
  try {
    return Response.json({ completedRound: await completeActiveRound(user, event, parsed.data) });
  } catch (error) {
    if (error instanceof RoundConflictError) {
      return Response.json({
        error: { code: "ROUND_VERSION_CONFLICT", message: "This round changed on another device. Review the preserved scores before finishing." },
        round: error.round,
      }, { status: 409 });
    }
    if (error instanceof RoundIncompleteError) return apiError("ROUND_INCOMPLETE", error.message, 422);
    if (error instanceof RoundUnavailableError) return apiError("ROUND_UNAVAILABLE", error.message, 409);
    return apiError("ROUND_COMPLETION_FAILED", "The round remains active. Try finishing it again after synchronization completes.", 503);
  }
}
