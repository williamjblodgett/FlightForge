import type { Course } from "./types";
import { statewideCourses } from "./statewide-courses";

export const courses: Course[] = statewideCourses;

export function getCourseBySlug(slug: string): Course | undefined {
  return courses.find((course) => course.slug === slug);
}

export function getCourseById(id: string): Course | undefined {
  return courses.find((course) => course.id === id);
}

export function formatCoursePrice(course: Course): string {
  if (course.operationalStatus === "UNAVAILABLE_REPORTED") return "Reported unavailable";
  if (course.costNote) return course.costNote.replace(/^Pay\s*-\s*/iu, "");
  if (course.priceType === "FREE") return "Free";
  if (course.priceFromCents == null) return "Confirm pricing";
  return `From $${(course.priceFromCents / 100).toFixed(0)}`;
}
