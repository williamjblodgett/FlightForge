import { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CalendarRange, Check, CircleDollarSign, ClipboardCheck, CloudRain, FileSpreadsheet, History, MapPinned, RefreshCcw, Settings2, ShieldCheck, Store, Upload } from "lucide-react";
import { createBookingQuote } from "@/modules/bookings/booking-engine";
import { courses } from "@/modules/courses/demo-courses";
import { normalizeCourseIdentity } from "@/modules/imports/course-import";
import { useDemoStore, type DemoClaim, type DemoClaimStatus } from "../demo-store";

type ImportPreview = { name: string; city: string; state: string; sourceUrl: string };

export function OwnerScreen() {
  const { state, update } = useDemoStore();
  const course = courses.find((item) => item.fictionalDemo) ?? courses[0];
  const [condition, setCondition] = useState(state.conditions[course?.id ?? ""] ?? "Open · Dry fairways");
  const [basePrice, setBasePrice] = useState(1200);
  const [time, setTime] = useState("11:00");
  const [member, setMember] = useState(false);
  const [rain, setRain] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview[]>([]);
  const [importStatus, setImportStatus] = useState("");
  const quote = useMemo(() => createBookingQuote({ courseId: course?.id ?? "demo", date: nextSaturday(), time, playerCount: 1, remainingCapacity: 4, unitPriceCents: basePrice, isMember: member, weatherRisk: rain ? "RAIN_LIKELY" : "NONE" }), [basePrice, course?.id, member, rain, time]);
  const duplicateCount = useMemo(() => {
    const seen = new Set<string>(); let duplicates = 0;
    for (const row of importPreview) { const key = `${normalizeCourseIdentity(row.name)}:${normalizeCourseIdentity(row.city)}:${row.state.toUpperCase()}`; if (seen.has(key)) duplicates += 1; seen.add(key); }
    return duplicates;
  }, [importPreview]);

  const saveCondition = () => {
    if (!course) return;
    update((current) => ({ ...current, conditions: { ...current.conditions, [course.id]: condition }, notificationCount: current.notificationCount + 1 }));
  };
  const loadImport = async (file: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setImportStatus("CSV must be 2 MB or smaller for browser review."); return; }
    const text = await file.text();
    const lines = text.split(/\r?\n/u).filter(Boolean);
    const headers = splitCsvLine(lines[0] ?? "").map((value) => value.toLowerCase());
    const required = ["name", "city", "state", "source_url"];
    if (!required.every((name) => headers.includes(name))) { setImportPreview([]); setImportStatus("CSV needs name, city, state, and source_url columns."); return; }
    const rows = lines.slice(1).map((line) => { const values = splitCsvLine(line); const field = (name: string) => values[headers.indexOf(name)]?.trim() ?? ""; return { name: field("name"), city: field("city"), state: field("state"), sourceUrl: field("source_url") }; }).filter((row) => row.name && row.city && row.state && /^https:\/\//u.test(row.sourceUrl));
    setImportPreview(rows.slice(0, 100));
    setImportStatus(`${rows.length} valid row${rows.length === 1 ? "" : "s"} ready for review. Nothing has been applied.`);
  };
  const applyBatch = () => {
    if (importPreview.length === 0 || duplicateCount > 0) return;
    const batch = { id: `batch-${Date.now()}`, sourceName: "Browser-reviewed CSV", recordCount: importPreview.length, appliedAt: new Date().toISOString(), rolledBackAt: null };
    update((current) => ({ ...current, importBatches: [batch, ...current.importBatches] }));
    setImportStatus("Batch applied to the device-local demo catalog. Source attribution is preserved in the preview.");
  };
  const rollback = (batchId: string) => update((current) => ({ ...current, importBatches: current.importBatches.map((batch) => batch.id === batchId ? { ...batch, rolledBackAt: new Date().toISOString() } : batch) }));

  return (
    <div className="screen owner-screen">
      <section className="screen-title compact-title"><div><span className="demo-eyebrow"><Settings2 /> Course operations</span><h1>Run the course without becoming software staff.</h1><p>These fictional operator tools make setup, conditions, safe pricing, and import review inspectable before anything is published.</p></div><span className="verified-pill"><Check />Managing fictional Forge Ridge</span></section>
      <section className="owner-metrics"><article><span><CalendarRange />Today’s reservations</span><strong>{state.reservations.length}</strong><small>{state.reservations.reduce((sum, reservation) => sum + reservation.playerCount, 0)} players expected</small></article><article><span><BarChart3 />Demo occupancy</span><strong>{state.reservations.length ? "38%" : "24%"}</strong><small>Capacity-safe reservations only</small></article><article><span><CircleDollarSign />Booked value</span><strong>${(state.reservations.reduce((sum, reservation) => sum + reservation.totalCents, 0) / 100).toFixed(2)}</strong><small>No payment collected</small></article><article><span><MapPinned />Course condition</span><strong>{condition.split(" · ")[0]}</strong><small>Course-reported demo state</small></article></section>
      <section className="owner-grid">
        <div className="workspace-card condition-panel"><div className="card-heading plain"><div><span className="demo-eyebrow">Operating status</span><h2>Publish today’s condition</h2></div><CloudRain /></div><label><span>Course condition</span><select value={condition} onChange={(event) => setCondition(event.target.value)}><option>Open · Dry fairways</option><option>Open · Wet and muddy</option><option>Delayed opening · Maintenance</option><option>Closed · Severe weather</option><option>Open · Cart restrictions</option></select></label><p>Players see this as <strong>course-reported</strong>, separate from provider weather and user reports.</p><button className="demo-button primary" type="button" onClick={saveCondition}>Save condition locally</button></div>
        <div className="workspace-card pricing-simulator"><div className="card-heading plain"><div><span className="demo-eyebrow">Safe pricing preview</span><h2>Test before publishing</h2></div><CircleDollarSign /></div><div className="form-grid two"><label><span>Base price</span><input type="number" min="0" max="100" step="1" value={basePrice / 100} onChange={(event) => setBasePrice(Math.round(Number(event.target.value) * 100))} /></label><label><span>Tee time</span><select value={time} onChange={(event) => setTime(event.target.value)}><option value="08:00">8:00 AM</option><option value="11:00">11:00 AM</option><option value="15:00">3:00 PM</option></select></label></div><label className="check-row"><input type="checkbox" checked={member} onChange={(event) => setMember(event.target.checked)} /><span>Member pricing</span></label><label className="check-row"><input type="checkbox" checked={rain} onChange={(event) => setRain(event.target.checked)} /><span>Rain likely</span></label><div className="simulator-result"><span>Preview total</span><strong>${(quote.totalCents / 100).toFixed(2)}</strong><ul>{quote.explanation.map((reason) => <li key={reason}>{reason}</li>)}</ul></div><p className="demo-disclosure">No countdown timers, hidden fees, or unsupported scarcity claims.</p></div>
      </section>

      <section className="workspace-card import-workspace">
        <div className="section-heading-row"><div><span className="demo-eyebrow"><FileSpreadsheet /> Import review + rollback</span><h2>Preview every catalog change</h2><p>Upload a CSV with factual fields and source URLs. This demo never scrapes or republishes third-party descriptions.</p></div><label className="demo-button secondary file-button"><Upload />Choose CSV<input type="file" accept=".csv,text/csv" onChange={(event) => void loadImport(event.target.files?.[0] ?? null)} /></label></div>
        {importStatus ? <p className="inline-status" role="status">{importStatus}</p> : null}
        {importPreview.length > 0 ? <><div className="import-summary"><span><strong>{importPreview.length}</strong> valid rows</span><span className={duplicateCount > 0 ? "danger" : "success"}><strong>{duplicateCount}</strong> duplicate candidates</span><span><strong>{importPreview.filter((row) => /^https:\/\//u.test(row.sourceUrl)).length}</strong> attributed sources</span></div><div className="import-table" role="table" aria-label="Import change preview"><div className="import-row header"><span>Action</span><span>Course</span><span>Location</span><span>Source</span></div>{importPreview.slice(0, 6).map((row, index) => <div className="import-row" key={`${row.name}-${index}`}><span className="create-pill">Review/create</span><span>{row.name}</span><span>{row.city}, {row.state}</span><span><a href={row.sourceUrl} target="_blank" rel="noreferrer">Source URL</a></span></div>)}</div><button className="demo-button primary" type="button" onClick={applyBatch} disabled={duplicateCount > 0}>Apply reviewed batch locally</button></> : <div className="empty-import"><FileSpreadsheet /><strong>No CSV selected</strong><span>The existing reviewed Maine JSON and CSV formats remain available in the source repository.</span></div>}
        {state.importBatches.length > 0 ? <div className="batch-history"><h3>Applied batch history</h3>{state.importBatches.map((batch) => <div key={batch.id}><span><strong>{batch.sourceName}</strong><small>{batch.recordCount} records · {new Date(batch.appliedAt).toLocaleString()}</small></span>{batch.rolledBackAt ? <span className="rolled-back"><RefreshCcw />Rolled back</span> : <button className="demo-button tertiary" type="button" onClick={() => rollback(batch.id)}>Rollback</button>}</div>)}</div> : null}
      </section>

      <ClaimReviewQueue />

      <section className="readiness-grid"><article><Store /><div><strong>Commerce remains gated</strong><p>Merchandise, food, lessons, passes, and Stripe Connect require verified operator identity, tax configuration, and provider credentials.</p></div></article><article><AlertTriangle /><div><strong>Launch checks are explicit</strong><p>Malware scanning, legal review, monitoring, payout disputes, and abuse response must pass before their feature flags can be enabled.</p></div></article></section>
    </div>
  );
}

function ClaimReviewQueue() {
  const { state } = useDemoStore();
  return (
    <section className="workspace-card claim-review-workspace">
      <div className="section-heading-row"><div><span className="demo-eyebrow"><ClipboardCheck /> Administrator claim review</span><h2>Decisions require a reason</h2><p>This device-local queue includes one clearly fictional fixture plus any claim submitted from Discover.</p></div><span className="verified-pill"><ShieldCheck />Admin simulation</span></div>
      <p className="admin-boundary"><AlertTriangle />A production administrator route performs server-side RBAC and organization isolation. This public Pages edition cannot grant administrator authority.</p>
      <div className="claim-review-list">{state.claims.length > 0 ? state.claims.map((claim) => <ClaimReviewItem claim={claim} key={claim.id} />) : <div className="empty-import"><ClipboardCheck /><strong>No claims waiting</strong><span>Submit one from an unclaimed course in Discover.</span></div>}</div>
    </section>
  );
}

function ClaimReviewItem({ claim }: { claim: DemoClaim }) {
  const { update } = useDemoStore();
  const [decision, setDecision] = useState<Exclude<DemoClaimStatus, "CLAIM_SUBMITTED">>("ADDITIONAL_INFORMATION_REQUIRED");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("");
  const course = courses.find((item) => item.id === claim.courseId);

  const review = () => {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 10) {
      setStatus("Enter a review reason of at least 10 characters.");
      return;
    }
    const reviewedAt = new Date().toISOString();
    update((current) => ({
      ...current,
      claims: current.claims.map((currentClaim) => currentClaim.id === claim.id ? {
        ...currentClaim,
        status: decision,
        version: currentClaim.version + 1,
        audit: [...currentClaim.audit, { id: crypto.randomUUID(), action: "REVIEWED", fromStatus: currentClaim.status, toStatus: decision, reason: normalizedReason, actor: "platform-admin@device.local", createdAt: reviewedAt }],
      } : currentClaim),
      notificationCount: current.notificationCount + 1,
    }));
    setReason("");
    setStatus(`Decision saved as ${formatClaimStatus(decision)} with an immutable local audit event.`);
  };

  return (
    <article className="claim-review-card">
      <div className="claim-review-summary"><div><span className="source-pill">{formatClaimStatus(claim.status)}</span><h3>{course?.name ?? "Unknown course"}</h3><p>{claim.applicantName} · {claim.applicantRole} · {claim.businessEmail}</p></div><span className="claim-version">v{claim.version}</span></div>
      <p>{claim.explanation}</p>
      <div className="claim-evidence"><ShieldCheck /><span>{claim.evidenceValidated ? "Evidence type and size validated locally" : "Evidence not validated"}</span><small>Bytes were not retained by Pages</small></div>
      <div className="claim-review-controls"><label><span>Decision</span><select value={decision} onChange={(event) => setDecision(event.target.value as Exclude<DemoClaimStatus, "CLAIM_SUBMITTED">)}><option value="ADDITIONAL_INFORMATION_REQUIRED">Request more information</option><option value="VERIFIED">Verify</option><option value="REJECTED">Reject</option><option value="SUSPENDED">Suspend</option></select></label><label><span>Required reason</span><input value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} placeholder="Explain the evidence-based decision" /></label><button className="demo-button primary" type="button" onClick={review}>Save decision</button></div>
      {status ? <p className="inline-status" role="status">{status}</p> : null}
      <details className="claim-audit"><summary><History />Audit history ({claim.audit.length})</summary>{claim.audit.map((event) => <div key={event.id}><strong>{event.action === "SUBMITTED" ? "Submitted" : formatClaimStatus(event.toStatus)}</strong><span>{event.reason}</span><small>{event.actor} · {new Date(event.createdAt).toLocaleString()}</small></div>)}</details>
    </article>
  );
}

function formatClaimStatus(status: DemoClaimStatus): string {
  return status.toLowerCase().replaceAll("_", " ").replace(/\b\w/gu, (character) => character.toUpperCase());
}

function splitCsvLine(line: string): string[] {
  const fields: string[] = []; let current = ""; let quoted = false;
  for (let index = 0; index < line.length; index += 1) { const character = line[index]; if (character === '"' && line[index + 1] === '"' && quoted) { current += '"'; index += 1; } else if (character === '"') quoted = !quoted; else if (character === "," && !quoted) { fields.push(current); current = ""; } else current += character; }
  fields.push(current); return fields;
}

function nextSaturday() { const date = new Date(); const delta = (6 - date.getDay() + 7) % 7 || 7; date.setDate(date.getDate() + delta); return date.toISOString().slice(0, 10); }
