"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileCheck2, LockKeyhole, Send } from "lucide-react";
import type { AuthenticatedUser } from "@/modules/auth/types";
import { brand } from "@/config/brand";
import type { Course } from "../types";

type Props = {
  course: Course;
  user: AuthenticatedUser;
};

type SubmissionResult = { claim: { id: string; status: string } };

export function CourseClaimForm({ course, user }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/claims", { method: "POST", body: formData });
      const body = (await response.json()) as SubmissionResult & { error?: { message?: string } };
      if (!response.ok) {
        setError(body.error?.message ?? "The claim could not be submitted.");
        return;
      }
      setResult(body);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(`${brand.productName} could not reach the claim service. Your form remains on this page.`);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="claim-success" role="status">
        <CheckCircle2 aria-hidden="true" />
        <span className="eyebrow">Claim received</span>
        <h1>Your application is in the review queue.</h1>
        <p>
          {brand.productName} recorded an immutable submission event. An administrator can request more information, verify, or reject the claim with a written reason.
        </p>
        <dl>
          <div><dt>Course</dt><dd>{course.name}</dd></div>
          <div><dt>Status</dt><dd>Claim submitted</dd></div>
          <div><dt>Reference</dt><dd>{result.claim.id}</dd></div>
        </dl>
        <Link className="button button-primary" href={`/courses/${course.slug}`}>Return to course</Link>
      </div>
    );
  }

  return (
    <form className="claim-form" onSubmit={submit} encType="multipart/form-data">
      <input type="hidden" name="courseId" value={course.id} />
      <div className="form-section-heading">
        <span>1</span><div><h2>Your authority</h2><p>Tell the reviewer who you are and how you represent the property.</p></div>
      </div>
      <div className="form-grid">
        <label>
          <span>Applicant name</span>
          <input name="applicantName" required minLength={2} maxLength={120} defaultValue={user.displayName} autoComplete="name" />
        </label>
        <label>
          <span>Role at the course</span>
          <input name="applicantRole" required minLength={2} maxLength={120} placeholder="Owner, general manager, park director…" />
        </label>
        <label>
          <span>Business email</span>
          <input name="businessEmail" type="email" required maxLength={254} defaultValue={user.email} autoComplete="email" />
        </label>
        <label>
          <span>Business phone</span>
          <input name="businessPhone" type="tel" required minLength={7} maxLength={30} placeholder="207-555-0123" autoComplete="tel" />
        </label>
        <label className="form-span-2">
          <span>Course or business website <small>Optional</small></span>
          <input name="website" type="url" maxLength={500} placeholder="https://" inputMode="url" />
        </label>
      </div>

      <div className="form-section-heading">
        <span>2</span><div><h2>Confirm your role</h2><p>Share enough information for our team to confirm that you are authorized to manage this course.</p></div>
      </div>
      <label className="form-textarea">
        <span>How are you authorized to manage this course?</span>
        <textarea
          name="explanation"
          required
          minLength={30}
          maxLength={3000}
          rows={6}
          placeholder="Describe your ownership, management role, municipal responsibility, or invitation from an existing verified owner."
        />
        <small>30–3,000 characters. Do not include passwords, payment details, or government ID numbers.</small>
      </label>
      <label className="file-drop">
        <FileCheck2 aria-hidden="true" />
        <span><strong>Attach a supporting document</strong><small>Optional PDF, PNG, or JPEG · 5 MB maximum</small></span>
        <input name="supportingDocument" type="file" accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg" />
      </label>

      <div className="claim-security-note">
        <LockKeyhole aria-hidden="true" />
        <p>Supporting documents are kept private, checked for valid file types, and available only to authorized FlightForge reviewers.</p>
      </div>
      <label className="checkbox-field">
        <input type="checkbox" required />
        <span>I confirm that this application is accurate and that I am authorized to request management access for this listing.</span>
      </label>

      {error ? <div className="form-error" role="alert">{error}</div> : null}
      <div className="form-actions">
        <Link className="button button-tertiary" href={`/courses/${course.slug}`}><ArrowLeft aria-hidden="true" /> Cancel</Link>
        <button className="button button-primary" type="submit" disabled={submitting}>
          {submitting ? "Submitting securely…" : "Submit claim"}
          {!submitting ? <Send aria-hidden="true" /> : null}
        </button>
      </div>
    </form>
  );
}
