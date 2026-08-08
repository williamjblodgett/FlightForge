import { apiError } from "@/lib/http/api-response";
import { isSameOriginMutation } from "@/lib/security/request-security";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { coordinatorReviewSchema, reviewCoordinatorApplication } from "@/modules/events/coordinator-repository";

export async function PATCH(request: Request, { params }: { params: Promise<{ applicationId: string }> }) { if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The review origin was rejected.", 403); const user = await getCurrentUser(); if (!user || !can(user, "viewAdmin")) return apiError("FORBIDDEN", "Administrator access is required.", 403); let body: unknown; try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Use valid JSON.", 400); } const parsed = coordinatorReviewSchema.safeParse(body); if (!parsed.success) return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Review the decision.", 422); const { applicationId } = await params; const result = await reviewCoordinatorApplication(user, applicationId, parsed.data).catch(() => null); return result ? Response.json({ application: result }) : apiError("CONFLICT", "That application is unavailable or already reviewed.", 409); }
