import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Building2, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/modules/auth/current-user";
import { CourseClaimForm } from "@/modules/courses/components/CourseClaimForm";
import { getCourseBySlug } from "@/modules/courses/demo-courses";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Claim a course",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ slug: string }> };

export default async function ClaimCoursePage({ params }: Props) {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  if (!course) notFound();
  const user = await getCurrentUser();

  if (course.claimStatus === "VERIFIED") {
    return (
      <main className="claim-page page-shell">
        <div className="access-card">
          <BadgeCheck aria-hidden="true" />
          <h1>This listing is already verified.</h1>
          <p>If management has changed, contact support so we can safely transfer access.</p>
          <Link className="button button-primary" href={`/courses/${course.slug}`}>Return to course</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="claim-page page-shell">
      <div className="claim-heading">
        <div>
          <span className="eyebrow"><Building2 aria-hidden="true" /> Operator verification</span>
          <h1>Claim {course.name}</h1>
          <p>Establish management authority before editing facts, adding staff, or enabling future reservations.</p>
        </div>
        <div className="claim-steps" aria-label="Claim review steps">
          <span className="is-active">Application</span><span>Manual review</span><span>Verified access</span>
        </div>
      </div>

      {!user ? (
        <div className="access-card">
          <ShieldCheck aria-hidden="true" />
          <h2>Sign in before submitting a claim</h2>
          <p>Your signed-in account is recorded with the application for security.</p>
          <Link className="button button-primary" href={`/sign-in?return_to=${encodeURIComponent(`/courses/${course.slug}/claim`)}`}>Sign in to continue</Link>
        </div>
      ) : (
        <CourseClaimForm course={course} user={user} />
      )}
    </main>
  );
}
