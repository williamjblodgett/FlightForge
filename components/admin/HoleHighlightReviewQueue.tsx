"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Film, ShieldCheck, XCircle } from "lucide-react";
import type { HoleHighlight } from "@/modules/highlights/highlight-repository";

export function HoleHighlightReviewQueue({ initialHighlights }: { initialHighlights: HoleHighlight[] }) {
  const [highlights, setHighlights] = useState(initialHighlights);
  const [message, setMessage] = useState("");
  const [decision, setDecision] = useState<{ id: string; status: "APPROVED" | "REJECTED" } | null>(null);
  const [reason, setReason] = useState("");
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { if (decision) { reasonRef.current?.focus(); document.body.style.overflow = "hidden"; } else document.body.style.overflow = ""; return () => { document.body.style.overflow = ""; }; }, [decision]);
  async function review() {
    if (!decision) return;
    if (!reason || reason.trim().length < 10) { setMessage("A review reason of at least 10 characters is required."); return; }
    const response = await fetch(`/api/admin/hole-highlights/${decision.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: decision.status, reason }) });
    if (!response.ok) { setMessage("The moderation decision could not be saved."); return; }
    setHighlights((items) => items.filter((item) => item.id !== decision.id));
    setMessage(`Highlight ${decision.status === "APPROVED" ? "approved for the scorecard" : "rejected"}.`);
    setDecision(null); setReason(""); triggerRef.current?.focus();
  }
  return <section>
    <div className="admin-section-heading"><div><span className="eyebrow">Community safety</span><h2>Hole video moderation</h2><p>Watch the complete clip, confirm consent and context, then record a reason for every decision.</p></div><div className="queue-count"><strong>{highlights.length}</strong><span>awaiting review</span></div></div>
    {message ? <p className="decision-message" role="status">{message}</p> : null}
    {highlights.length ? <div className="highlight-review-list">{highlights.map((highlight) => <article key={highlight.id}>
      <video controls playsInline preload="metadata" src={`/api/hole-highlights/${highlight.id}/media`} />
      <div><span className="status-chip status-claim_submitted">Pending</span><h3>Hole {highlight.holeNumber}</h3><p>{highlight.caption || "No caption provided."}</p><small>{highlight.uploaderDisplayName} · {highlight.durationSeconds}s · {new Date(highlight.createdAt).toLocaleString()}</small></div>
      <div className="highlight-review-actions"><button type="button" onClick={(event) => { triggerRef.current = event.currentTarget; setDecision({ id: highlight.id, status: "APPROVED" }); }}><CheckCircle2 aria-hidden="true" />Approve</button><button type="button" onClick={(event) => { triggerRef.current = event.currentTarget; setDecision({ id: highlight.id, status: "REJECTED" }); }}><XCircle aria-hidden="true" />Reject</button></div>
    </article>)}</div> : <div className="empty-state"><ShieldCheck aria-hidden="true" /><h3>The video queue is clear</h3><p>New hole moments will remain private until reviewed.</p></div>}
    <p className="moderation-footer"><Film aria-hidden="true" />Approval confirms only that the clip passed platform review. It does not independently verify the score or achievement shown.</p>
    {decision ? <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDecision(null); }}><section className="video-modal moderation-dialog" role="dialog" aria-modal="true" aria-labelledby="moderation-title" onKeyDown={(event) => { if (event.key === "Escape") { setDecision(null); triggerRef.current?.focus(); } }}><button className="modal-close" aria-label="Close moderation dialog" onClick={() => setDecision(null)}><XCircle /></button><h2 id="moderation-title">{decision.status === "APPROVED" ? "Approve sanitized video" : "Reject video"}</h2><p>Record the evidence and policy basis. This action is audited.</p><label><span>Required reason</span><textarea ref={reasonRef} value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} rows={4} /></label><div className="dialog-actions"><button className="button button-secondary" onClick={() => setDecision(null)}>Cancel</button><button className="button button-primary" onClick={review}>Save decision</button></div></section></div> : null}
  </section>;
}
