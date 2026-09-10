import {clampCoursePage,isInMapBounds,parseMapBounds,toCourseMapSummary} from "@/modules/courses/map-model";
import type { Metadata } from "next";
import { getCurrentUser } from "@/modules/auth/current-user";
import { CourseExplorer } from "@/modules/courses/components/CourseExplorer";
import { getFavoriteCourseIds } from "@/modules/courses/course-repository";
import { courses } from "@/modules/courses/demo-courses";
import { brand } from "@/config/brand";
import { filterCourses, rankCoursesForDiscovery } from "@/modules/courses/search";
import type { CourseDifficulty, CoursePriceType } from "@/modules/courses/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discover courses",
  description: `Search ${brand.productName}'s New England disc golf course collection.`,
  alternates: { canonical: "/courses" },
};

export default async function CoursesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  const query = await searchParams;
  const initialFilters = {
    query: scalar(query.q), state: scalar(query.state) || "ALL",
    difficulty: enumValue(scalar(query.difficulty), ["ALL", "UNRATED", "BEGINNER", "RECREATIONAL", "INTERMEDIATE", "ADVANCED"] as const, "ALL") as CourseDifficulty | "ALL",
    priceType: enumValue(scalar(query.price), ["ALL", "FREE", "PAID", "MIXED"] as const, "ALL") as CoursePriceType | "ALL",
    holes: enumValue(scalar(query.holes), ["ALL", "9", "18", "36"] as const, "ALL"),
    evidence: enumValue(scalar(query.source) || scalar(query.evidence), ["ALL", "AUTHORITATIVE", "DIRECTORY"] as const, "ALL"),
    view: enumValue(scalar(query.view), ["split", "list", "map"] as const, "list"),
  };
  const matches = rankCoursesForDiscovery(filterCourses(courses, {
    query: initialFilters.query, state: initialFilters.state, difficulty: initialFilters.difficulty,
    priceType: initialFilters.priceType, minimumHoles: initialFilters.holes === "ALL" ? null : Number(initialFilters.holes), evidence: initialFilters.evidence,
  }));
  const bounds = parseMapBounds(scalar(query.bbox));
  const areaMatches = matches.filter(c => isInMapBounds(c,bounds));
  const page = clampCoursePage(scalar(query.page),areaMatches.length);
  const pageSize = 24;
  const pageCourses = areaMatches.slice((page - 1) * pageSize, page * pageSize);
  const accountReady = Boolean(user && !user.identityLinkRequired);
  const favoriteIds = user && accountReady
    ? await getFavoriteCourseIds(user.email).catch(() => [])
    : [];
  return (
    <main>
      <CourseExplorer
        key={JSON.stringify({...initialFilters,view:undefined,page,bounds})}
        courses={pageCourses}
        mapCourses={matches.map(toCourseMapSummary)}
        initialBounds={bounds}
        totalMatches={areaMatches.length}
        page={page}
        pageSize={pageSize}
        initialFilters={initialFilters}
        initialFavoriteIds={favoriteIds}
        signedIn={accountReady}
        variant="directory"
      />
    </main>
  );
}

function scalar(value: string | string[] | undefined) { return typeof value === "string" ? value.slice(0, 200) : ""; }
function enumValue<T extends string>(value: string, options: readonly T[], fallback: T): T { return options.includes(value as T) ? value as T : fallback; }
