import { apiError } from "@/lib/http/api-response";
import { can } from "@/modules/auth/permissions";
import { getCurrentUser } from "@/modules/auth/current-user";
import { getCourseById } from "@/modules/courses/demo-courses";
import { toggleFavoriteCourse } from "@/modules/courses/course-repository";
import { checkRateLimit, isSameOriginMutation } from "@/lib/security/request-security";
import { brand } from "@/config/brand";

type RouteContext = { params: Promise<{ courseId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  if (!isSameOriginMutation(request)) {
    return apiError("ORIGIN_REJECTED", "The favorite request origin was rejected.", 403);
  }
  const user = await getCurrentUser();
  if (!user) return apiError("AUTHENTICATION_REQUIRED", "Sign in to save courses.", 401);
  if (!can(user, "favoriteCourse")) {
    return apiError("FORBIDDEN", "Your account cannot save courses.", 403);
  }
  const rateLimit = await checkRateLimit("favorite", user.email, 60, 60).catch(() => null);
  if (!rateLimit) return apiError("RATE_LIMIT_UNAVAILABLE", "Favorites are temporarily unavailable.", 503);
  if (!rateLimit.allowed) return apiError("RATE_LIMITED", "Too many favorite updates. Try again shortly.", 429);

  const { courseId } = await params;
  if (!getCourseById(courseId)) {
    return apiError("COURSE_NOT_FOUND", "That course does not exist.", 404);
  }

  try {
    return Response.json(await toggleFavoriteCourse(user, courseId));
  } catch {
    return apiError(
      "FAVORITE_UNAVAILABLE",
      `${brand.productName} could not update this favorite. Try again.`,
      503,
    );
  }
}
