"use client";

import { useState, type FormEvent } from "react";

export function CourseCorrectionForm({ courseId = "", courseName = "" }: { courseId?: string; courseName?: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/course-corrections", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const body = await response.json().catch(() => null) as { request?: { id: string }; error?: { message?: string } } | null;
    setBusy(false);
    if (!response.ok) return setMessage(body?.error?.message ?? "The correction could not be submitted.");
    event.currentTarget.reset();
    setMessage(`Correction received. Reference ${body?.request?.id ?? "pending"}.`);
  }
  return <form className="correction-form panel" onSubmit={submit}>
    <input type="hidden" name="courseId" value={courseId || ""} />
    <label><span>Course name</span><input name="courseName" defaultValue={courseName} minLength={2} maxLength={160} required /></label>
    <label><span>Your name</span><input name="reporterName" autoComplete="name" minLength={2} maxLength={100} required /></label>
    <label><span>Your email</span><input name="reporterEmail" type="email" autoComplete="email" required /></label>
    <label><span>What needs correction?</span><select name="correctionType" defaultValue="OTHER"><option value="LOCATION">Location</option><option value="ACCESS">Access or fee</option><option value="HOURS">Hours or season</option><option value="CLOSURE">Closure</option><option value="CONTACT">Contact details</option><option value="OTHER">Other</option></select></label>
    <label className="wide"><span>Details</span><textarea name="details" minLength={20} maxLength={3000} rows={6} required /></label>
    <label className="wide"><span>Supporting source URL <small>Optional</small></span><input name="sourceUrl" type="url" maxLength={1000} placeholder="https://" /></label>
    <p>Submissions enter a review queue. They do not change a public listing automatically.</p>
    <button className="button button-primary" disabled={busy}>{busy ? "Submitting…" : "Submit correction"}</button>
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}
