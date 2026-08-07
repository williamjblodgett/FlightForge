import type { Course } from "./types";
import { statewideCourses } from "./statewide-courses";
import { authoritativeNewEnglandCourses } from "./new-england-courses";

export { fictionalDemoCourse } from "./fictional-demo-course";

/** Public, source-attributed listings only. Fictional fixtures live separately. */
export const courses: Course[] = [...statewideCourses, ...authoritativeNewEnglandCourses];

export function getCourseBySlug(slug: string): Course | undefined {
  return courses.find((course) => course.slug === slug);
}

export function getCourseById(id: string): Course | undefined {
  return courses.find((course) => course.id === id);
}

export function formatCoursePrice(course: Course): string {
  if (course.operationalStatus === "UNAVAILABLE_REPORTED") return "Reported unavailable";
  if (course.priceFromCents != null) return `From $${(course.priceFromCents / 100).toFixed(0)}`;
  if (course.priceType === "FREE") return "Free";
  if (course.priceType === "PAID") return "Pay to play";
  return "Confirm pricing";
}
