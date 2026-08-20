import { apiError } from "@/lib/http/api-response";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { createReport } from "@/modules/community/community-repository";
import { communityErrorResponse, requireCommunityActor } from "@/modules/community/route-support";
import { reportSchema } from "@/modules/community/validation";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return apiError("ORIGIN_REJECTED", "The report origin was rejected.", 403);
  try {
    const user = await requireCommunityActor();
    const rateLimit = await checkRateLimit("community-report", user.id, 10, 3_600).catch(() => null);
    if (!rateLimit?.allowed) return apiError(rateLimit ? "RATE_LIMITED" : "RATE_LIMIT_UNAVAILABLE", "The report could not be submitted right now.", rateLimit ? 429 : 503);
    let body: unknown;
    try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Use valid JSON.", 400); }
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) return apiError("VALIDATION_ERROR", "Review the report details.", 422, parsed.error.flatten());
    return Response.json({ report: await createReport(user, parsed.data) }, { status: 201 });
  } catch (error) { return communityErrorResponse(error); }
}
