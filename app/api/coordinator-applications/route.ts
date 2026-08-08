import { apiError } from "@/lib/http/api-response";
import { isSameOriginMutation } from "@/lib/security/request-security";
import { getCurrentUser } from "@/modules/auth/current-user";
import { applyForCoordinator, coordinatorApplicationSchema } from "@/modules/events/coordinator-repository";

export async function POST(request: Request) { if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The application origin was rejected.", 403); const user = await getCurrentUser(); if (!user) return apiError("AUTH_REQUIRED", "Sign in to apply.", 401); let body: unknown; try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Use valid JSON.", 400); } const parsed = coordinatorApplicationSchema.safeParse(body); if (!parsed.success) return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Review the application.", 422); const application = await applyForCoordinator(user, parsed.data).catch(() => null); return application ? Response.json({ application }, { status: 201 }) : apiError("SAVE_FAILED", "The application could not be saved.", 503); }
