import { apiError } from "@/lib/http/api-response";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import {
  ClaimEvidenceError,
  deleteClaimEvidence,
  storeClaimEvidence,
} from "@/modules/courses/claim-evidence";
import { submitCourseClaim } from "@/modules/courses/course-repository";
import { getCourseById } from "@/modules/courses/demo-courses";
import { courseClaimSchema } from "@/modules/courses/validation";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return apiError("ORIGIN_REJECTED", "The claim request origin was rejected.", 403);
  }
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to claim a course.", 401);
  if (!can(user, "submitCourseClaim")) {
    return apiError("FORBIDDEN", "Your account cannot submit course claims.", 403);
  }
  const rateLimit = await checkRateLimit("course-claim", user.email, 5, 3600).catch(() => null);
  if (!rateLimit) return apiError("RATE_LIMIT_UNAVAILABLE", "Claim submission is temporarily unavailable.", 503);
  if (!rateLimit.allowed) return apiError("RATE_LIMITED", "Too many claim attempts. Try again later.", 429);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("INVALID_FORM", "Submit the claim as multipart form data.", 400);
  }

  const parsed = courseClaimSchema.safeParse({
    courseId: formData.get("courseId"),
    applicantName: formData.get("applicantName"),
    applicantRole: formData.get("applicantRole"),
    businessEmail: formData.get("businessEmail"),
    businessPhone: formData.get("businessPhone"),
    website: formData.get("website") ?? "",
    explanation: formData.get("explanation"),
  });
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Check the highlighted claim details.",
      422,
      parsed.error.flatten(),
    );
  }

  const course = getCourseById(parsed.data.courseId);
  if (!course) return apiError("COURSE_NOT_FOUND", "That course does not exist.", 404);
  if (course.claimStatus === "VERIFIED") {
    return apiError("COURSE_ALREADY_VERIFIED", "This course is already verified.", 409);
  }

  let evidenceKey: string | null = null;
  const file = formData.get("supportingDocument");
  try {
    if (file instanceof File && file.size > 0) {
      evidenceKey = await storeClaimEvidence(file, user.id, course.id);
    }
    const claim = await submitCourseClaim(user, parsed.data, evidenceKey);
    return Response.json({ claim }, { status: 201 });
  } catch (error: unknown) {
    if (evidenceKey) await deleteClaimEvidence(evidenceKey).catch(() => undefined);
    if (error instanceof ClaimEvidenceError) {
      return apiError("INVALID_EVIDENCE", error.message, 422);
    }
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint failed")) {
      return apiError(
        "DUPLICATE_CLAIM",
        "You already submitted a claim for this course.",
        409,
      );
    }
    return apiError(
      "CLAIM_SUBMISSION_FAILED",
      "FlightForge could not save the claim. No evidence file was retained.",
      503,
    );
  }
}
