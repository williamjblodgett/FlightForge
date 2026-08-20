"use client";

import { useState } from "react";
import { Flag, ShieldAlert } from "lucide-react";
import {
  availableReportReviewActions,
  type CommunityReportRecord,
  type ReportReviewAction,
} from "@/modules/community/types";

type Notice = { kind: "success" | "error"; text: string };

export function CommunityReportQueue({
  initialReports,
  initialLoadError = null,
}: {
  initialReports: CommunityReportRecord[];
  initialLoadError?: string | null;
}) {
  const [reports, setReports] = useState(initialReports);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function review(event: React.FormEvent<HTMLFormElement>, report: CommunityReportRecord) {
    event.preventDefault(); setBusyId(report.id); setNotice(null);
    const form = new FormData(event.currentTarget);
    const action = String(form.get("action")) as ReportReviewAction;
    const reason = String(form.get("reason") || "");
    const durationHours = Number(form.get("durationHours"));
    try {
      const response = await fetch(`/api/community/admin/reports/${encodeURIComponent(report.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, reason, ...(action === "MUTE" || action === "SUSPEND" ? { durationHours } : {}) }),
      });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) setNotice({ kind: "error", text: body.error?.message ?? "The moderation decision could not be saved." });
      else { setReports((items) => items.filter((item) => item.id !== report.id)); setNotice({ kind: "success", text: "Moderation decision saved and audited." }); }
    } catch { setNotice({ kind: "error", text: "The moderation service could not be reached." }); }
    finally { setBusyId(null); }
  }

  return <section className="admin-panel">
    <div className="admin-panel-heading"><div><span className="eyebrow"><Flag aria-hidden="true" /> Community safety</span><h2>Open reports</h2><p>Review context carefully. Every action requires a reason and creates an audit record.</p></div><span className="queue-count">{reports.length} open</span></div>
    {initialLoadError ? <div className="form-error" role="alert"><strong>Reports are temporarily unavailable.</strong><p>{initialLoadError}</p><a className="button button-secondary" href="/admin/reports">Try loading the queue again</a></div> : null}
    {notice ? <p className={notice.kind === "error" ? "form-error" : "form-success"} role={notice.kind === "error" ? "alert" : "status"} aria-live="polite">{notice.text}</p> : null}
    {!initialLoadError && reports.length ? <div className="moderation-report-list">{reports.map((report) => <article key={report.id}>
      <header><div><strong>{formatLabel(report.category)}</strong><span>{formatLabel(report.targetType)} · submitted by {report.reporterDisplayName}</span></div><time dateTime={report.createdAt}>{new Date(report.createdAt).toLocaleString()}</time></header>
      {report.details ? <p>{report.details}</p> : <p>No additional details were supplied.</p>}
      <section aria-labelledby={`report-target-${report.id}`}>
        <h3 id={`report-target-${report.id}`}>{report.targetDisplayName ?? "Target no longer available"}</h3>
        {report.targetBody !== null ? <blockquote>{report.targetBody}</blockquote> : <p>No message body is available for this report type.</p>}
        {report.moderationStatus ? <p><strong>Content status:</strong> {formatLabel(report.moderationStatus)}</p> : null}
        <small>Target ID: {report.targetId}</small>
      </section>
      {!report.moderationTargetUserId ? <p role="note">This report does not resolve to one player, so mute, suspend, and ban actions are unavailable.</p> : null}
      <ReportDecisionForm report={report} busy={busyId === report.id} onReview={review} />
    </article>)}</div> : !initialLoadError ? <div className="empty-state"><ShieldAlert aria-hidden="true" /><h3>No open community reports</h3><p>New reports will appear here with their conversation context.</p></div> : null}
  </section>;
}

function ReportDecisionForm({
  report,
  busy,
  onReview,
}: {
  report: CommunityReportRecord;
  busy: boolean;
  onReview: (event: React.FormEvent<HTMLFormElement>, report: CommunityReportRecord) => Promise<void>;
}) {
  const actions = availableReportReviewActions(report);
  const [action, setAction] = useState<ReportReviewAction>("DISMISS");
  const needsDuration = action === "MUTE" || action === "SUSPEND";
  return <form onSubmit={(event) => void onReview(event, report)}>
    <label><span>Action</span><select name="action" value={action} disabled={busy} onChange={(event) => setAction(event.target.value as ReportReviewAction)}>{actions.map((availableAction) => <option key={availableAction} value={availableAction}>{actionLabel(availableAction)}</option>)}</select></label>
    {needsDuration ? <label><span>Duration</span><select name="durationHours" defaultValue="24" disabled={busy}><option value="1">1 hour</option><option value="24">24 hours</option><option value="168">7 days</option><option value="720">30 days</option></select></label> : null}
    <label className="wide"><span>Required reason</span><textarea name="reason" minLength={5} maxLength={1000} rows={3} disabled={busy} required /></label>
    <button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save audited decision"}</button>
  </form>;
}

function actionLabel(action: ReportReviewAction): string {
  const labels: Record<ReportReviewAction, string> = {
    DISMISS: "Dismiss report",
    REMOVE_CONTENT: "Remove message",
    MUTE: "Temporarily mute user",
    SUSPEND: "Temporarily suspend user",
    BAN: "Ban user",
  };
  return labels[action];
}

function formatLabel(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
