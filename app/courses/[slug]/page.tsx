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
  Database,
  ExternalLink,
  Flag,
  Footprints,
  MapPin,
  ShieldCheck,
  TriangleAlert,
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
import { brand } from "@/config/brand";

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
    description: `${course.name} in ${course.city}, ${course.state}: source-attributed location, availability evidence, access, and course facts.`,
    alternates: { canonical: `/courses/${course.slug}` },
    openGraph: {
      title: `${course.name} · ${brand.productName}`,
      description: `Review source evidence for ${course.name} in ${course.city}, ${course.state}.`,
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
    url: `https://${brand.domain}/courses/${course.slug}`,
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
            ) : course.verificationLevel === "OPERATOR_SOURCE_REVIEWED" ? (
              <span className="verified-badge source-reviewed"><BadgeCheck aria-hidden="true" /> Primary source reviewed</span>
            ) : course.verificationLevel === "DIRECTORY_CROSS_CHECKED" ? (
              <span className="source-badge"><Database aria-hidden="true" /> Two directories matched</span>
            ) : (
              <span className="source-badge"><Database aria-hidden="true" /> One directory source</span>
            )}
            <span className={`status-chip status-${course.operationalStatus.toLowerCase()}`}>
              {course.operationalStatus === "UNAVAILABLE_REPORTED" ? <TriangleAlert aria-hidden="true" /> : null}
              {operationalLabel(course)}
            </span>
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
              View primary source <ExternalLink aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {course.claimStatus !== "VERIFIED" ? (
        <div className="page-shell detail-notice"><UnclaimedNotice courseSlug={course.slug} /></div>
      ) : null}

      <div className="detail-layout page-shell">
        <div className="detail-main">
          <section className="detail-section" aria-labelledby="course-overview-heading">
            <div className="section-heading">
              <span className="eyebrow">At a glance</span>
              <h2 id="course-overview-heading">Plan the right kind of round</h2>
            </div>
            <div className="facts-grid">
              <article><Flag aria-hidden="true" /><span>Course size</span><strong>{course.holeCount > 0 ? `${course.holeCount} holes` : "Not confirmed"}</strong><small>Directory factual field</small></article>
              <article><Trees aria-hidden="true" /><span>Difficulty</span><strong>{course.difficulty === "UNRATED" ? "Not source-verified" : titleCase(course.difficulty)}</strong><small>No rating inferred from reviews</small></article>
              <article><Footprints aria-hidden="true" /><span>Access</span><strong>{course.access ?? "Not confirmed"}</strong><small>{course.availabilityType ?? "Schedule not confirmed"}</small></article>
              <article><CloudSun aria-hidden="true" /><span>Same-day condition</span><strong>Check before travel</strong><small>Availability evidence is not live weather or closure data</small></article>
            </div>
          </section>

          <section className="detail-section" aria-labelledby="amenities-heading">
            <div className="section-heading">
              <span className="eyebrow">Know before you go</span>
              <h2 id="amenities-heading">Amenities</h2>
            </div>
            {course.amenities.length ? (
              <div className="amenity-grid">
                {course.amenities.map((amenity) => <span key={amenity}><Check aria-hidden="true" />{amenity}</span>)}
              </div>
            ) : (
              <div className="inline-empty-state"><Database aria-hidden="true" /><div><strong>Amenities not imported</strong><p>FlightForge does not infer amenities from reviews. An operator can add and verify them after claiming this listing.</p></div></div>
            )}
          </section>

          <section className="detail-section" aria-labelledby="layouts-heading">
            <div className="section-heading">
              <span className="eyebrow">Course configuration</span>
              <h2 id="layouts-heading">Layouts</h2>
            </div>
            <div className="layout-list">
              <article>
                <div><span>01</span><div><strong>Directory course record</strong><p>{course.holeCount > 0 ? `${course.holeCount} holes reported` : "Hole count not confirmed"} · hole-level maps require operator verification.</p></div></div>
                <span className="layout-status">Awaiting operator map</span>
              </article>
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
              <p>{brand.productName} stores factual fields and source links. It does not copy third-party reviews, photographs, maps, ratings, or protected descriptions.</p>
              <div className="source-evidence-list">
                {course.sources.map((source) => (
                  <article key={`${source.type}-${source.url}`}>
                    <div><strong>{source.name}</strong><span>{source.authoritative ? source.type === "PUBLIC_AGENCY" ? "Public-agency source" : "Operator / facility source" : source.type === "PDGA_DIRECTORY" ? "Independent directory cross-check" : "Current directory record"}</span></div>
                    <p>{source.observation ?? "Factual listing fields reviewed."}</p>
                    {source.supports?.length ? <small>Supports: {source.supports.map((field) => field.toLowerCase()).join(", ")}</small> : null}
                    <a href={source.url} target="_blank" rel="noreferrer">Inspect source <ExternalLink aria-hidden="true" /></a>
                  </article>
                ))}
              </div>
              <dl>
                <div><dt>Last reviewed</dt><dd>{new Date(course.lastReviewedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</dd></div>
                <div><dt>Location precision</dt><dd>{course.locationPrecision.replaceAll("_", " ").toLowerCase()}</dd></div>
                {course.nextReviewDueAt ? <div><dt>Review due</dt><dd>{new Date(course.nextReviewDueAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</dd></div> : null}
                <div><dt>Evidence level</dt><dd>{verificationLabel(course)}</dd></div>
                <div><dt>Availability</dt><dd>{operationalLabel(course)}; same-day status not guaranteed</dd></div>
              </dl>
            </div>
          </section>
        </div>

        <aside className="booking-panel" aria-label="Availability and primary actions">
          <span className="eyebrow">Tee time</span>
          <div className="booking-price"><strong>{formatCoursePrice(course)}</strong><span>source note; confirm before travel</span></div>
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
          <p className="booking-fineprint">FlightForge reservations are not connected to this operator. Availability evidence above is informational, not a reservation.</p>
          <Link className="text-link" href={`/support/course-correction?courseId=${encodeURIComponent(course.id)}&courseName=${encodeURIComponent(course.name)}`}>Report incorrect course information</Link>
        </aside>
      </div>
    </main>
  );
}

function titleCase(value: string): string {
  return value[0] + value.slice(1).toLowerCase();
}

function operationalLabel(course: NonNullable<ReturnType<typeof getCourseBySlug>>): string {
  switch (course.operationalStatus) {
    case "OPERATOR_CONFIRMED_AVAILABLE": return "Primary source reports available";
    case "OPERATOR_CONFIRMED_SEASONAL": return "Primary source reports seasonally available";
    case "AVAILABLE_REPORTED": return "Directory reports available";
    case "SEASONAL_AVAILABLE": return "Directory reports seasonally available";
    case "UNAVAILABLE_REPORTED": return "Directory reports unavailable";
    default: return "Current status not confirmed";
  }
}

function verificationLabel(course: NonNullable<ReturnType<typeof getCourseBySlug>>): string {
  if (course.verificationLevel === "OPERATOR_SOURCE_REVIEWED") return "Operator, facility, or public-agency source reviewed";
  if (course.verificationLevel === "DIRECTORY_CROSS_CHECKED") return "Two independent directory records matched";
  return "One current directory record; manual review still required";
}
