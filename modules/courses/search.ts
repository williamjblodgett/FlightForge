import type { Course, CourseDifficulty, CoursePriceType } from "./types";

export type CourseSearchFilters = {
  query: string;
  difficulty: CourseDifficulty | "ALL";
  priceType: CoursePriceType | "ALL";
  minimumHoles: number | null;
  state?: string | "ALL";
  evidence?: "ALL" | "AUTHORITATIVE" | "DIRECTORY";
};

export function filterCourses(
  courses: Course[],
  filters: CourseSearchFilters,
): Course[] {
  const normalizedQuery = normalizeSearchText(filters.query);
  return courses.filter((course) => {
    const searchText = normalizeSearchText(
      [
        course.name,
        course.city,
        course.state,
        course.postalCode ?? "",
        course.operationalStatus,
        course.availabilityType ?? "",
        course.access ?? "",
        course.costNote ?? "",
        ...course.terrain,
        ...course.amenities,
      ].join(" "),
    );
    return (
      (!normalizedQuery || searchText.includes(normalizedQuery)) &&
      (filters.difficulty === "ALL" || course.difficulty === filters.difficulty) &&
      (filters.priceType === "ALL" || course.priceType === filters.priceType) &&
      (filters.minimumHoles == null || course.holeCount >= filters.minimumHoles) &&
      (!filters.state || filters.state === "ALL" || course.state === filters.state) &&
      (!filters.evidence || filters.evidence === "ALL" ||
        (filters.evidence === "AUTHORITATIVE"
          ? course.verificationLevel === "OPERATOR_SOURCE_REVIEWED"
          : course.verificationLevel !== "OPERATOR_SOURCE_REVIEWED"))
    );
  });
}

export function rankCoursesForDiscovery(courses: Course[]): Course[] {
  return [...courses].sort((left, right) => {
    const rankDifference = discoveryRank(left) - discoveryRank(right);
    if (rankDifference !== 0) return rankDifference;
    return left.name.localeCompare(right.name, "en-US");
  });
}

function discoveryRank(course: Course): number {
  const unavailablePenalty = course.operationalStatus === "UNAVAILABLE_REPORTED" ? 10 : 0;
  const verificationRank = course.verificationLevel === "OPERATOR_SOURCE_REVIEWED"
    ? 0
    : course.verificationLevel === "DIRECTORY_CROSS_CHECKED"
      ? 1
      : 2;
  return unavailablePenalty + verificationRank;
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replaceAll(/\s+/gu, " ")
    .trim();
}
