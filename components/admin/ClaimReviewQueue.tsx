"use client";

import { useState } from "react";
import { CheckCircle2, Download, FileClock, ShieldAlert } from "lucide-react";
import type { CourseClaimRecord } from "@/modules/courses/course-repository";
import type { Course } from "@/modules/courses/types";

type Props = {
  initialClaims: CourseClaimRecord[];
  courses: Pick<Course, "id" | "name" | "city" | "state">[];
};

type DecisionStatus =
  | "ADDITIONAL_INFORMATION_REQUIRED"
  | "VERIFIED"
  | "REJECTED"
  | "SUSPENDED";

export function ClaimReviewQueue({ initialClaims, courses }: Props) {
  const [claims, setClaims] = useState(initialClaims);
  const pending = claims.filter((claim) => claim.status === "CLAIM_SUBMITTED").length;
  return (
    <section>
      <div className="admin-section-heading">
        <div><span className="eyebrow">Verification queue</span><h2>Course claims</h2><p>Review authority, evidence, and source records before changing operator access.</p></div>
        <div className="queue-count"><strong>{pending}</strong><span>awaiting review</span></div>
      </div>
      {claims.length ? (
        <div className="claim-queue">
          {claims.map((claim) => (
            <ClaimReviewCard
              key={`${claim.id}-${claim.version}`}
              claim={claim}
              course={courses.find((course) => course.id === claim.courseId)}
              onUpdate={(updated) => setClaims((current) => current.map((item) => item.id === updated.id ? updated : item))}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state"><CheckCircle2 aria-hidden="true" /><h3>The claim queue is clear</h3><p>New owner applications will appear here.</p></div>
      )}
    </section>
  );
}

function ClaimReviewCard({
  claim,
  course,
  onUpdate,
}: {
  claim: CourseClaimRecord;
  course: Pick<Course, "id" | "name" | "city" | "state"> | undefined;
  onUpdate: (claim: CourseClaimRecord) => void;
}) {
  const [status, setStatus] = useState<DecisionStatus>("VERIFIED");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function review() {
    if (reason.trim().length < 10) {
      setMessage("Add a decision reason of at least 10 characters.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/claims/${claim.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      const body = (await response.json()) as { claim?: CourseClaimRecord; error?: { message?: string } };
      if (!response.ok || !body.claim) {
        setMessage(body.error?.message ?? "The decision could not be saved.");
        return;
      }
      onUpdate(body.claim);
      setMessage("Decision saved and audit event created.");
    } catch {
      setMessage("The review service is unavailable. No decision was saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="claim-review-card">
      <header>
        <div>
          <span className={`status-chip status-${claim.status.toLowerCase()}`}>{formatStatus(claim.status)}</span>
          <h3>{course?.name ?? "Unknown course"}</h3>
          <p>{course ? `${course.city}, ${course.state}` : claim.courseId}</p>
        </div>
        <span className="claim-date"><FileClock aria-hidden="true" />{new Date(claim.createdAt).toLocaleDateString()}</span>
      </header>
      <div className="claim-review-details">
        <dl>
          <div><dt>Applicant</dt><dd>{claim.applicantName}</dd></div>
          <div><dt>Role</dt><dd>{claim.applicantRole}</dd></div>
          <div><dt>Business email</dt><dd><a href={`mailto:${claim.businessEmail}`}>{claim.businessEmail}</a></dd></div>
          <div><dt>Business phone</dt><dd>{claim.businessPhone}</dd></div>
          <div className="claim-explanation"><dt>Authority statement</dt><dd>{claim.explanation}</dd></div>
        </dl>
        {claim.website ? <a className="text-link" href={claim.website} target="_blank" rel="noreferrer">Open business website</a> : null}
        {claim.supportingDocumentKey ? (
          <a className="evidence-link" href={`/api/admin/claims/${claim.id}/evidence`}><Download aria-hidden="true" /> Download private evidence</a>
        ) : <span className="no-evidence">No file attached</span>}
      </div>

      {claim.status === "CLAIM_SUBMITTED" || claim.status === "ADDITIONAL_INFORMATION_REQUIRED" ? (
        <div className="claim-decision-panel">
          <div className="decision-warning"><ShieldAlert aria-hidden="true" /><span>Confirm evidence outside FlightForge when needed. A verified decision grants future management access.</span></div>
          <div className="decision-fields">
            <label><span>Decision</span><select value={status} onChange={(event) => setStatus(event.target.value as DecisionStatus)}><option value="VERIFIED">Verify claim</option><option value="ADDITIONAL_INFORMATION_REQUIRED">Request more information</option><option value="REJECTED">Reject claim</option><option value="SUSPENDED">Suspend claim</option></select></label>
            <label><span>Required reason</span><textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Describe the evidence and policy basis for this decision." /></label>
          </div>
          <button className="button button-primary" type="button" onClick={review} disabled={busy}>{busy ? "Saving…" : "Record decision"}</button>
          {message ? <p className="decision-message" role="status">{message}</p> : null}
        </div>
      ) : (
        <div className="decision-complete"><CheckCircle2 aria-hidden="true" /><div><strong>{formatStatus(claim.status)}</strong><p>{claim.reviewReason}</p><span>Reviewed by {claim.reviewedBy}</span></div></div>
      )}
    </article>
  );
}

function formatStatus(status: string): string {
  return status.toLowerCase().replaceAll("_", " ").replace(/^./u, (character) => character.toUpperCase());
}
