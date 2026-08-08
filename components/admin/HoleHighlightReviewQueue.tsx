"use client";

import { useState } from "react";
import { CheckCircle2, Film, ShieldCheck, XCircle } from "lucide-react";
import type { HoleHighlight } from "@/modules/highlights/highlight-repository";

export function HoleHighlightReviewQueue({ initialHighlights }: { initialHighlights: HoleHighlight[] }) {
  const [highlights, setHighlights] = useState(initialHighlights);
  const [message, setMessage] = useState("");
  async function review(id: string, status: "APPROVED" | "REJECTED") {
    const reason = window.prompt(status === "APPROVED" ? "Approval reason (at least 10 characters)" : "Rejection reason (at least 10 characters)");
    if (!reason || reason.trim().length < 10) { setMessage("A review reason of at least 10 characters is required."); return; }
    const response = await fetch(`/api/admin/hole-highlights/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, reason }) });
    if (!response.ok) { setMessage("The moderation decision could not be saved."); return; }
    setHighlights((items) => items.filter((item) => item.id !== id));
    setMessage(`Highlight ${status === "APPROVED" ? "approved for the scorecard" : "rejected"}.`);
  }
  return <section>
    <div className="admin-section-heading"><div><span className="eyebrow">Community safety</span><h2>Hole video moderation</h2><p>Watch the complete clip, confirm consent and context, then record a reason for every decision.</p></div><div className="queue-count"><strong>{highlights.length}</strong><span>awaiting review</span></div></div>
    {message ? <p className="decision-message" role="status">{message}</p> : null}
    {highlights.length ? <div className="highlight-review-list">{highlights.map((highlight) => <article key={highlight.id}>
      <video controls playsInline preload="metadata" src={`/api/hole-highlights/${highlight.id}/media`} />
      <div><span className="status-chip status-claim_submitted">Pending</span><h3>Hole {highlight.holeNumber}</h3><p>{highlight.caption || "No caption provided."}</p><small>{highlight.uploaderDisplayName} · {highlight.durationSeconds}s · {new Date(highlight.createdAt).toLocaleString()}</small></div>
      <div className="highlight-review-actions"><button type="button" onClick={() => review(highlight.id, "APPROVED")}><CheckCircle2 aria-hidden="true" />Approve</button><button type="button" onClick={() => review(highlight.id, "REJECTED")}><XCircle aria-hidden="true" />Reject</button></div>
    </article>)}</div> : <div className="empty-state"><ShieldCheck aria-hidden="true" /><h3>The video queue is clear</h3><p>New hole moments will remain private until reviewed.</p></div>}
    <p className="moderation-footer"><Film aria-hidden="true" />Approval confirms only that the clip passed platform review. It does not independently verify the score or achievement shown.</p>
  </section>;
}
