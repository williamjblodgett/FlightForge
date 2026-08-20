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
import { CommunityChannelLink } from "@/components/community/CommunityChannelLink";

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
    description: `${course.name} in ${course.city}, ${course.state}: location, access, course details, and planning information.`,
    alternates: { canonical: `/courses/${course.slug}` },
    openGraph: {
      title: `${course.name} · ${brand.productName}`,
      description: `Plan a round at ${course.name} in ${course.city}, ${course.state}.`,
      images: [],
    },
    twitter: {
      card: "summary",
      title: `${course.name} · ${brand.productName}`,
      description: `Plan a round at ${course.name} in ${course.city}, ${course.state}.`,
      images: [],
    },
  };
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  if (!course) notFound();

  const user = await getCurrentUser();
  const accountReady = Boolean(user && !user.identityLinkRequired);
  const favoriteIds = user && accountReady
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
              <span className="verified-badge source-reviewed"><BadgeCheck aria-hidden="true" /> Official details checked</span>
            ) : course.verificationLevel === "DIRECTORY_CROSS_CHECKED" ? (
              <span className="source-badge"><Database aria-hidden="true" /> Listing cross-checked</span>
            ) : (
              <span className="source-badge"><Database aria-hidden="true" /> Directory listing</span>
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
              signedIn={accountReady}
              showLabel
            />
            <ShareCourseButton courseName={course.name} />
            <CommunityChannelLink contextType="COURSE" contextId={course.id} signedIn={Boolean(user)} label="Course community" className="button button-secondary" />
            <a className="button button-tertiary" href={course.sourceUrl} target="_blank" rel="noreferrer">
              Visit course information <ExternalLink aria-hidden="true" />
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
              <article><Flag aria-hidden="true" /><span>Course size</span><strong>{course.holeCount > 0 ? `${course.holeCount} holes` : "Not confirmed"}</strong><small>Confirm current layout before playing</small></article>
              <article><Trees aria-hidden="true" /><span>Difficulty</span><strong>{course.difficulty === "UNRATED" ? "Not yet rated" : titleCase(course.difficulty)}</strong><small>Difficulty can vary by layout</small></article>
              <article><Footprints aria-hidden="true" /><span>Access</span><strong>{course.access ?? "Not confirmed"}</strong><small>{course.availabilityType ?? "Schedule not confirmed"}</small></article>
              <article><CloudSun aria-hidden="true" /><span>Same-day condition</span><strong>Check before travel</strong><small>Weather, closures, and access can change</small></article>
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
              <div className="inline-empty-state"><Database aria-hidden="true" /><div><strong>Amenities not listed yet</strong><p>The course team can add restrooms, rentals, food, accessibility details, and other amenities after claiming this page.</p></div></div>
            )}
          </section>

          <section className="detail-section" aria-labelledby="layouts-heading">
            <div className="section-heading">
              <span className="eyebrow">Course configuration</span>
              <h2 id="layouts-heading">Layouts</h2>
            </div>
            <div className="layout-list">
              <article>
                <div><span>01</span><div><strong>Course layout</strong><p>{course.holeCount > 0 ? `${course.holeCount} holes listed` : "Hole count not confirmed"} · detailed hole maps are not available yet.</p></div></div>
                <span className="layout-status">Course map unavailable</span>
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
              <h2 id="source-heading">Course information</h2>
              <p>Use these links to check current details directly with the course, facility, public agency, or directory that published them.</p>
              <div className="source-evidence-list">
                {course.sources.map((source) => (
                  <article key={`${source.type}-${source.url}`}>
                    <div><strong>{source.name}</strong><span>{source.authoritative ? source.type === "PUBLIC_AGENCY" ? "Public information" : "Course or facility information" : source.type === "PDGA_DIRECTORY" ? "Course directory" : "Course directory"}</span></div>
                    <p>{source.observation ?? "Listing details checked."}</p>
                    <a href={source.url} target="_blank" rel="noreferrer">View information <ExternalLink aria-hidden="true" /></a>
                  </article>
                ))}
              </div>
              <dl>
                <div><dt>Details checked</dt><dd>{new Date(course.lastReviewedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</dd></div>
                <div><dt>Map location</dt><dd>{locationLabel(course)}</dd></div>
                <div><dt>Listing type</dt><dd>{verificationLabel(course)}</dd></div>
                <div><dt>Availability</dt><dd>{operationalLabel(course)}; confirm before traveling</dd></div>
              </dl>
            </div>
          </section>
        </div>

        <aside className="booking-panel" aria-label="Availability and primary actions">
          <span className="eyebrow">Tee time</span>
          <div className="booking-price"><strong>{formatCoursePrice(course)}</strong><span>confirm current pricing with the course</span></div>
          {course.nextAvailableAt ? (
            <div className="next-time"><CalendarClock aria-hidden="true" /><div><span>Next availability</span><strong>{course.nextAvailableAt}</strong></div></div>
          ) : (
            <div className="next-time is-muted"><Clock3 aria-hidden="true" /><div><span>Reservations</span><strong>Contact the course for booking details</strong></div></div>
          )}
          <a className="button button-primary button-wide" href={course.sourceUrl} target="_blank" rel="noreferrer">
            Check with the course <ExternalLink aria-hidden="true" />
          </a>
          {course.claimStatus !== "VERIFIED" ? (
            <Link className="button button-secondary button-wide" href={`/courses/${course.slug}/claim`}>Claim this course</Link>
          ) : null}
          <p className="booking-fineprint">Online reservations are not available through FlightForge for this course yet. Confirm access directly before traveling.</p>
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
    case "OPERATOR_CONFIRMED_AVAILABLE": return "Listed as available";
    case "OPERATOR_CONFIRMED_SEASONAL": return "Seasonal availability";
    case "AVAILABLE_REPORTED": return "Listed as available";
    case "SEASONAL_AVAILABLE": return "Seasonal availability";
    case "UNAVAILABLE_REPORTED": return "Reported unavailable";
    default: return "Confirm before visiting";
  }
}

function verificationLabel(course: NonNullable<ReturnType<typeof getCourseBySlug>>): string {
  if (course.verificationLevel === "OPERATOR_SOURCE_REVIEWED") return "Course, facility, or public listing";
  if (course.verificationLevel === "DIRECTORY_CROSS_CHECKED") return "Cross-checked directory listing";
  return "Course directory listing";
}

function locationLabel(course: NonNullable<ReturnType<typeof getCourseBySlug>>): string {
  if (course.locationPrecision === "ENTRANCE_GEOCODED") return "Course entrance";
  if (course.locationPrecision === "FACILITY_GEOCODED") return "Course facility";
  if (course.locationPrecision === "FACILITY_APPROXIMATE") return "Approximate course location";
  return "Approximate directory location";
}
