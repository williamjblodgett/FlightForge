import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  Check,
  Clock3,
  CloudSun,
  ExternalLink,
  Flag,
  Footprints,
  MapPin,
  ShieldCheck,
  Sparkles,
  Trees,
} from "lucide-react";
import { getCurrentUser } from "@/modules/auth/current-user";
import { getFavoriteCourseIds } from "@/modules/courses/course-repository";
import { courses, formatCoursePrice, getCourseBySlug } from "@/modules/courses/demo-courses";
import { CourseHeroArt } from "@/modules/courses/components/CourseHeroArt";
import { CourseLocator } from "@/modules/courses/components/CourseLocator";
import { FavoriteButton } from "@/modules/courses/components/FavoriteButton";
import { ShareCourseButton } from "@/modules/courses/components/ShareCourseButton";
import { UnclaimedNotice } from "@/modules/courses/components/UnclaimedNotice";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return courses.map((course) => ({ slug: course.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  if (!course) return {};
  return {
    title: course.name,
    description: `${course.name} in ${course.city}, ${course.state}: ${course.holeCount} holes, ${course.terrain.join(", ").toLowerCase()} terrain, and source-attributed course facts.`,
    alternates: { canonical: `/courses/${course.slug}` },
    openGraph: {
      title: `${course.name} · FlightForge`,
      description: `Explore ${course.holeCount} holes in ${course.city}, Maine.`,
    },
  };
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  if (!course) notFound();

  const user = await getCurrentUser();
  const favoriteIds = user
    ? await getFavoriteCourseIds(user.email).catch(() => [])
    : [];
  const isFavorite = favoriteIds.includes(course.id);
  const address = [course.addressLine1, course.city, course.state, course.postalCode]
    .filter(Boolean)
    .join(", ");

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: course.name,
    description: course.shortDescription,
    address: {
      "@type": "PostalAddress",
      streetAddress: course.addressLine1 ?? undefined,
      addressLocality: course.city,
      addressRegion: course.state,
      postalCode: course.postalCode ?? undefined,
      addressCountry: course.countryCode,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: course.latitude,
      longitude: course.longitude,
    },
    url: `https://flightforge.example/courses/${course.slug}`,
  };

  return (
    <main className="course-detail-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }}
      />
      <div className="detail-breadcrumb page-shell">
        <Link href="/courses"><ArrowLeft aria-hidden="true" /> All courses</Link>
        <span aria-hidden="true">/</span>
        <span>{course.city}, {course.state}</span>
      </div>

      <section className="detail-hero page-shell">
        <CourseHeroArt course={course} />
        <div className="detail-hero-copy">
          <div className="detail-badges">
            {course.verifiedBadge ? (
              <span className="verified-badge"><BadgeCheck aria-hidden="true" /> Verified operator</span>
            ) : (
              <span className="source-badge">Source reviewed · operator unverified</span>
            )}
            {course.fictionalDemo ? <span className="demo-badge">Fictional demo data</span> : null}
          </div>
          <h1>{course.name}</h1>
          <p className="detail-location"><MapPin aria-hidden="true" /> {address}</p>
          <p className="detail-summary">{course.shortDescription}</p>
          <div className="detail-actions">
            <FavoriteButton
              courseId={course.id}
              courseName={course.name}
              initialFavorite={isFavorite}
              signedIn={Boolean(user)}
              showLabel
            />
            <ShareCourseButton courseName={course.name} />
            <a className="button button-tertiary" href={course.sourceUrl} target="_blank" rel="noreferrer">
              Official source <ExternalLink aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {course.claimStatus !== "VERIFIED" ? (
        <div className="page-shell detail-notice"><UnclaimedNotice courseSlug={course.slug} /></div>
      ) : course.fictionalDemo ? (
        <div className="page-shell detail-notice demo-data-notice">
          <Sparkles aria-hidden="true" />
          <div><strong>This is fictional demonstration data.</strong><p>Availability, condition, and verification states exist only to show the intended product behavior.</p></div>
        </div>
      ) : null}

      <div className="detail-layout page-shell">
        <div className="detail-main">
          <section className="detail-section" aria-labelledby="course-overview-heading">
            <div className="section-heading">
              <span className="eyebrow">At a glance</span>
              <h2 id="course-overview-heading">Plan the right kind of round</h2>
            </div>
            <div className="facts-grid">
              <article><Flag aria-hidden="true" /><span>Course size</span><strong>{course.holeCount} holes</strong><small>{course.layoutCount} {course.layoutCount === 1 ? "layout" : "layouts"}</small></article>
              <article><Trees aria-hidden="true" /><span>Difficulty</span><strong>{titleCase(course.difficulty)}</strong><small>{course.terrain.join(" · ")}</small></article>
              <article><Footprints aria-hidden="true" /><span>Estimated pace</span><strong>{course.holeCount > 18 ? "Half or full day" : course.holeCount === 9 ? "45–75 min" : "1.5–2.5 hr"}</strong><small>Self-paced estimate</small></article>
              <article><CloudSun aria-hidden="true" /><span>Course condition</span><strong>{course.currentCondition ?? "Not reported"}</strong><small>{course.conditionSource === "DEMO" ? "Fictional demo status" : "Awaiting operator update"}</small></article>
            </div>
          </section>

          <section className="detail-section" aria-labelledby="amenities-heading">
            <div className="section-heading">
              <span className="eyebrow">Know before you go</span>
              <h2 id="amenities-heading">Amenities</h2>
            </div>
            <div className="amenity-grid">
              {course.amenities.map((amenity) => <span key={amenity}><Check aria-hidden="true" />{amenity}</span>)}
            </div>
            {!course.verifiedBadge ? <p className="data-caveat">Amenities are source-reviewed but have not been confirmed by the operator in FlightForge.</p> : null}
          </section>

          <section className="detail-section" aria-labelledby="layouts-heading">
            <div className="section-heading">
              <span className="eyebrow">Course configuration</span>
              <h2 id="layouts-heading">Layouts</h2>
            </div>
            <div className="layout-list">
              {Array.from({ length: course.layoutCount }, (_, index) => (
                <article key={index}>
                  <div><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{course.fictionalDemo ? ["North Loop", "Granite Longs", "Short Forge"][index] : `Source layout ${index + 1}`}</strong><p>{course.fictionalDemo ? `${course.holeCount === 18 ? 18 : Math.round(course.holeCount / course.layoutCount)} holes · mapped for demonstration` : "Hole-level facts require operator verification."}</p></div></div>
                  <span className="layout-status">{course.fictionalDemo ? "Demo map ready" : "Awaiting map"}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="detail-section" aria-labelledby="location-heading">
            <div className="section-heading">
              <span className="eyebrow">Location</span>
              <h2 id="location-heading">Find the first tee</h2>
            </div>
            <CourseLocator course={course} />
          </section>

          <section className="source-panel" aria-labelledby="source-heading">
            <ShieldCheck aria-hidden="true" />
            <div>
              <h2 id="source-heading">Source and data status</h2>
              <p>FlightForge stores factual seed fields and a source link. It does not copy third-party reviews, photographs, maps, or protected descriptions.</p>
              <dl>
                <div><dt>Source</dt><dd><a href={course.sourceUrl} target="_blank" rel="noreferrer">{course.sourceName} <ExternalLink aria-hidden="true" /></a></dd></div>
                <div><dt>Reviewed</dt><dd>{new Date(course.lastReviewedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</dd></div>
                <div><dt>Status</dt><dd>{course.dataVerificationStatus === "FICTIONAL_DEMO" ? "Fictional demonstration" : "Source reviewed only"}</dd></div>
              </dl>
            </div>
          </section>
        </div>

        <aside className="booking-panel" aria-label="Availability and primary actions">
          <span className="eyebrow">Tee time</span>
          <div className="booking-price"><strong>{formatCoursePrice(course)}</strong><span>{course.priceFromCents ? "per player demo price" : "operator pricing unavailable"}</span></div>
          {course.nextAvailableAt ? (
            <div className="next-time"><CalendarClock aria-hidden="true" /><div><span>Next availability</span><strong>{course.nextAvailableAt}</strong></div></div>
          ) : (
            <div className="next-time is-muted"><Clock3 aria-hidden="true" /><div><span>Reservations</span><strong>Not connected</strong></div></div>
          )}
          <Link className="button button-primary button-wide" href="/roadmap#booking">
            {course.nextAvailableAt ? "Preview tee times" : "Booking roadmap"}
          </Link>
          {course.claimStatus !== "VERIFIED" ? (
            <Link className="button button-secondary button-wide" href={`/courses/${course.slug}/claim`}>Claim this course</Link>
          ) : null}
          <p className="booking-fineprint">Final totals, policies, and capacity checks will appear before checkout when booking launches.</p>
        </aside>
      </div>
    </main>
  );
}

function titleCase(value: string): string {
  return value[0] + value.slice(1).toLowerCase();
}
