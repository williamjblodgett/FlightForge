import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Search } from "lucide-react";
import { getCurrentUser } from "@/modules/auth/current-user";
import { CourseCard } from "@/modules/courses/components/CourseCard";
import { getFavoriteCourseIds } from "@/modules/courses/course-repository";
import { courses } from "@/modules/courses/demo-courses";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saved courses",
  robots: { index: false, follow: false },
};

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="saved-page page-shell">
        <div className="access-card"><Heart aria-hidden="true" /><h1>Keep your shortlist in one place.</h1><p>Sign in to save courses and return to them from any device.</p><Link className="button button-primary" href="/sign-in?return_to=%2Ffavorites">Sign in to continue</Link></div>
      </main>
    );
  }
  let ids: string[] = [];
  let unavailable = false;
  try {
    ids = await getFavoriteCourseIds(user.email);
  } catch {
    unavailable = true;
  }
  const favorites = courses.filter((course) => ids.includes(course.id));
  return (
    <main className="saved-page page-shell">
      <header className="saved-heading"><span className="eyebrow">Your short list</span><h1>Saved courses</h1><p>Compare the places you want to play next.</p></header>
      {unavailable ? <div className="form-error" role="alert">Saved courses are temporarily unavailable. No favorites were changed.</div> : null}
      {favorites.length ? (
        <div className="saved-grid">{favorites.map((course) => <CourseCard key={course.id} course={course} favorite signedIn />)}</div>
      ) : (
        <div className="empty-state"><Heart aria-hidden="true" /><h2>No saved courses yet</h2><p>Tap the heart on any course to build your short list.</p><Link className="button button-primary" href="/courses"><Search aria-hidden="true" /> Browse courses</Link></div>
      )}
    </main>
  );
}
