import type { Metadata } from "next";
import { CourseExplorer } from "@/modules/courses/components/CourseExplorer";
import { courses } from "@/modules/courses/demo-courses";
import { getCurrentUser } from "@/modules/auth/current-user";
import { getFavoriteCourseIds } from "@/modules/courses/course-repository";
import { brand } from "@/config/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find your next round",
  description: `Discover source-attributed New England disc golf listings in ${brand.productName}.`,
};

export default async function Home() {
  const user = await getCurrentUser();
  let favoriteIds: string[] = [];
  if (user) {
    favoriteIds = await getFavoriteCourseIds(user.email).catch(() => []);
  }

  return (
    <main>
      <CourseExplorer
        courses={courses}
        initialFavoriteIds={favoriteIds}
        signedIn={Boolean(user)}
        variant="home"
      />
      <section className="platform-strip page-shell" id="platform">
        <div>
          <span className="eyebrow">One platform, two sides of the tee</span>
          <h2>Better rounds for players. Clearer operations for courses.</h2>
        </div>
        <div className="platform-paths">
          <article>
            <span>01</span>
            <h3>For players</h3>
            <p>Find reliable course facts, save your short list, and carry one profile from discovery to improvement.</p>
          </article>
          <article>
            <span>02</span>
            <h3>For operators</h3>
            <p>Claim a source listing, establish trust, and prepare for bookings, events, and course intelligence.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Built to expand</h3>
            <p>Maine seeds the launch; country codes, regional fields, geographic indexes, and modular providers keep the product global.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
