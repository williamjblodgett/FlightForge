import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CourseExplorer } from "@/modules/courses/components/CourseExplorer";
import { courses } from "@/modules/courses/demo-courses";
import { getCurrentUser } from "@/modules/auth/current-user";
import { getFavoriteCourseIds } from "@/modules/courses/course-repository";

export const dynamic = "force-dynamic";

const states: Record<string, { code: string; name: string }> = {
  maine: { code: "ME", name: "Maine" },
  massachusetts: { code: "MA", name: "Massachusetts" },
  "new-hampshire": { code: "NH", name: "New Hampshire" },
  vermont: { code: "VT", name: "Vermont" },
  connecticut: { code: "CT", name: "Connecticut" },
  "rhode-island": { code: "RI", name: "Rhode Island" },
};

type Props = { params: Promise<{ state: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state } = await params;
  const selected = states[state];
  if (!selected) return {};
  return {
    title: `Disc golf courses in ${selected.name}`,
    description: `Explore disc golf courses in ${selected.name}.`,
    alternates: { canonical: `/places/${state}` },
  };
}

export default async function StateCoursePage({ params }: Props) {
  const { state } = await params;
  const selected = states[state];
  if (!selected) notFound();
  const stateCourses = courses.filter((course) => course.state === selected.code);
  const user = await getCurrentUser();
  const accountReady = Boolean(user && !user.identityLinkRequired);
  const favoriteIds = user && accountReady ? await getFavoriteCourseIds(user.email).catch(() => []) : [];
  return <main><CourseExplorer courses={stateCourses} initialFavoriteIds={favoriteIds} signedIn={accountReady} variant="directory" /></main>;
}
