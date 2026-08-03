import type { Course, CourseDifficulty, CoursePriceType } from "./types";

export type CourseSearchFilters = {
  query: string;
  difficulty: CourseDifficulty | "ALL";
  priceType: CoursePriceType | "ALL";
  minimumHoles: number | null;
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
        ...course.terrain,
        ...course.amenities,
      ].join(" "),
    );
    return (
      (!normalizedQuery || searchText.includes(normalizedQuery)) &&
      (filters.difficulty === "ALL" || course.difficulty === filters.difficulty) &&
      (filters.priceType === "ALL" || course.priceType === filters.priceType) &&
      (filters.minimumHoles == null || course.holeCount >= filters.minimumHoles)
    );
  });
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replaceAll(/\s+/gu, " ")
    .trim();
}
