import { apiError } from "@/lib/http/api-response";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { getClaimEvidence } from "@/modules/courses/claim-evidence";
import { getCourseClaim } from "@/modules/courses/course-repository";

type RouteContext = { params: Promise<{ claimId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to review evidence.", 401);
  if (!can(user, "reviewCourseClaim")) {
    return apiError("FORBIDDEN", "Platform administrator access is required.", 403);
  }

  const { claimId } = await params;
  const claim = await getCourseClaim(claimId);
  if (!claim) return apiError("CLAIM_NOT_FOUND", "That claim does not exist.", 404);
  if (!claim.supportingDocumentKey) {
    return apiError("EVIDENCE_NOT_FOUND", "No supporting evidence is attached.", 404);
  }

  const object = await getClaimEvidence(claim.supportingDocumentKey);
  if (!object) return apiError("EVIDENCE_NOT_FOUND", "The evidence file is unavailable.", 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-disposition", 'attachment; filename="claim-evidence"');
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}
