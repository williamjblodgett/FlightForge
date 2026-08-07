import type { Metadata } from "next";
import { getCurrentUser } from "@/modules/auth/current-user";
import { CourseExplorer } from "@/modules/courses/components/CourseExplorer";
import { getFavoriteCourseIds } from "@/modules/courses/course-repository";
import { courses } from "@/modules/courses/demo-courses";
import { brand } from "@/config/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discover courses",
  description: `Search ${brand.productName}'s source-attributed New England course collection.`,
  alternates: { canonical: "/courses" },
};

export default async function CoursesPage() {
  const user = await getCurrentUser();
  const favoriteIds = user
    ? await getFavoriteCourseIds(user.email).catch(() => [])
    : [];
  return (
    <main>
      <CourseExplorer
        courses={courses}
        initialFavoriteIds={favoriteIds}
        signedIn={Boolean(user)}
        variant="directory"
      />
    </main>
  );
}
