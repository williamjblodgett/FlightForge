"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, FilePenLine, Info, MapPin, Send, ShieldCheck } from "lucide-react";
import type { EventRecord } from "@/modules/events/types";

type CourseOption = { id: string; name: string; city: string };

type Props = {
  organizerEmail: string;
  courses: CourseOption[];
  initial?: EventRecord;
};

type FormState = {
  organizationName: string;
  eventType: EventRecord["eventType"];
  title: string;
  summary: string;
  description: string;
  courseId: string;
  venueName: string;
  addressLine1: string;
  city: string;
  regionCode: string;
  startsAt: string;
  endsAt: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  registrationUrl: string;
  contactEmail: string;
  capacity: string;
  entryFee: string;
  format: string;
  divisions: string;
  accessibilityNotes: string;
  visibility: EventRecord["visibility"];
};

export function EventPublisherForm({ organizerEmail, courses, initial }: Props) {
  const [form, setForm] = useState<FormState>(() => initialState(organizerEmail, initial));
  const [submitting, setSubmitting] = useState<"DRAFT" | "PUBLISH" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const selectedCourse = useMemo(() => courses.find((course) => course.id === form.courseId), [courses, form.courseId]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function chooseCourse(courseId: string) {
    const course = courses.find((candidate) => candidate.id === courseId);
    setForm((current) => ({
      ...current,
      courseId,
      venueName: course ? course.name : current.venueName,
      city: course ? course.city : current.city,
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const action = submitter?.value === "DRAFT" ? "DRAFT" : "PUBLISH";
    setSubmitting(action);
    setError(null);
    const payload = {
      organizationName: form.organizationName,
      eventType: form.eventType,
      title: form.title,
      summary: form.summary,
      description: form.description,
      courseId: form.courseId || null,
      venueName: form.venueName,
      addressLine1: form.addressLine1 || null,
      city: form.city,
      regionCode: form.regionCode,
      countryCode: "US",
      startsAt: toIso(form.startsAt),
      endsAt: toIso(form.endsAt),
      registrationOpensAt: form.registrationOpensAt ? toIso(form.registrationOpensAt) : null,
      registrationClosesAt: form.registrationClosesAt ? toIso(form.registrationClosesAt) : null,
      registrationUrl: form.registrationUrl || null,
      contactEmail: form.contactEmail,
      capacity: form.capacity ? Number(form.capacity) : null,
      entryFeeCents: Math.round(Number(form.entryFee || 0) * 100),
      currency: "USD",
      format: form.format,
      divisions: form.divisions.split(",").map((division) => division.trim()).filter(Boolean),
      accessibilityNotes: form.accessibilityNotes || null,
      visibility: form.visibility,
      action,
      ...(initial ? { version: initial.version } : {}),
    };
    try {
      const response = await fetch(initial ? `/api/events/${initial.id}` : "/api/events", {
        method: initial ? "PUT" : "POST",
        headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
        body: JSON.stringify(payload),
      });
      const body = await response.json() as { error?: { message?: string }; next?: string };
      if (!response.ok) {
        setError(body.error?.message ?? "The event could not be saved.");
        return;
      }
      window.location.assign(body.next ?? "/events/manage");
    } catch {
      setError("The event service could not be reached. Your entries remain in this form.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <form className="event-editor" onSubmit={submit}>
      <div className="event-editor-intro">
        <ShieldCheck aria-hidden="true" />
        <div><strong>Coordinator publishing</strong><p>Drafts stay private. Publishing makes the event immediately visible on the public Events page and records an audit event.</p></div>
      </div>

      <section className="editor-section">
        <div className="editor-section-heading"><span>01</span><div><h2>Event identity</h2><p>Use plain language that casual and competitive players can understand.</p></div></div>
        <div className="editor-grid">
          <label><span>Organizer or club</span><input required minLength={2} maxLength={120} value={form.organizationName} onChange={(event) => set("organizationName", event.target.value)} /></label>
          <label><span>Event type</span><select value={form.eventType} onChange={(event) => set("eventType", event.target.value as FormState["eventType"])}><option value="TOURNAMENT">Tournament</option><option value="LEAGUE">League event</option><option value="CLINIC">Clinic</option><option value="CASUAL">Organized casual round</option><option value="FUNDRAISER">Fundraiser</option></select></label>
          <label className="editor-span-2"><span>Event name</span><input required minLength={3} maxLength={140} value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="Pine Tree Open" /></label>
          <label className="editor-span-2"><span>Short summary</span><input required minLength={20} maxLength={240} value={form.summary} onChange={(event) => set("summary", event.target.value)} placeholder="A welcoming one-day event with recreational and advanced divisions." /></label>
          <label className="editor-span-2"><span>Full description</span><textarea required minLength={30} maxLength={5000} rows={7} value={form.description} onChange={(event) => set("description", event.target.value)} /></label>
        </div>
      </section>

      <section className="editor-section">
        <div className="editor-section-heading"><span>02</span><div><h2><MapPin aria-hidden="true" /> Place and schedule</h2><p>Link a known course when possible, or enter an external venue.</p></div></div>
        <div className="editor-grid">
          <label className="editor-span-2"><span>FlightForge course <small>Optional</small></span><select value={form.courseId} onChange={(event) => chooseCourse(event.target.value)}><option value="">External or undecided venue</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name} — {course.city}</option>)}</select></label>
          <label><span>Venue name</span><input required minLength={2} maxLength={160} value={form.venueName} onChange={(event) => set("venueName", event.target.value)} /></label>
          <label><span>City</span><input required minLength={2} maxLength={80} value={form.city} onChange={(event) => set("city", event.target.value)} /></label>
          <label><span>Street address <small>Optional</small></span><input maxLength={160} value={form.addressLine1} onChange={(event) => set("addressLine1", event.target.value)} /></label>
          <label><span>State</span><input required minLength={2} maxLength={3} value={form.regionCode} onChange={(event) => set("regionCode", event.target.value.toUpperCase())} /></label>
          <label><span>Starts</span><input required type="datetime-local" value={form.startsAt} onChange={(event) => set("startsAt", event.target.value)} /></label>
          <label><span>Ends</span><input required type="datetime-local" value={form.endsAt} onChange={(event) => set("endsAt", event.target.value)} /></label>
        </div>
        {selectedCourse ? <p className="field-note"><Info aria-hidden="true" /> Linked to {selectedCourse.name}. Players can open the course listing from the published event.</p> : null}
      </section>

      <section className="editor-section">
        <div className="editor-section-heading"><span>03</span><div><h2>Registration details</h2><p>FlightForge shows the facts; registration and payment remain with the organizer’s declared provider.</p></div></div>
        <div className="editor-grid">
          <label><span>Format</span><input required minLength={2} maxLength={100} value={form.format} onChange={(event) => set("format", event.target.value)} placeholder="Two rounds · stroke play" /></label>
          <label><span>Divisions <small>Comma separated</small></span><input value={form.divisions} onChange={(event) => set("divisions", event.target.value)} placeholder="Mixed Amateur, Women, Junior" /></label>
          <label><span>Capacity <small>Optional</small></span><input type="number" min={1} max={5000} value={form.capacity} onChange={(event) => set("capacity", event.target.value)} /></label>
          <label><span>Entry fee (USD)</span><input type="number" min={0} max={10000} step="0.01" value={form.entryFee} onChange={(event) => set("entryFee", event.target.value)} /></label>
          <label><span>Registration opens <small>Optional</small></span><input type="datetime-local" value={form.registrationOpensAt} onChange={(event) => set("registrationOpensAt", event.target.value)} /></label>
          <label><span>Registration closes <small>Optional</small></span><input type="datetime-local" value={form.registrationClosesAt} onChange={(event) => set("registrationClosesAt", event.target.value)} /></label>
          <label className="editor-span-2"><span>Registration URL <small>Optional</small></span><input type="url" maxLength={500} value={form.registrationUrl} onChange={(event) => set("registrationUrl", event.target.value)} placeholder="https://" /></label>
          <label><span>Public contact email</span><input required type="email" maxLength={254} value={form.contactEmail} onChange={(event) => set("contactEmail", event.target.value)} /></label>
          <label><span>Visibility</span><select value={form.visibility} onChange={(event) => set("visibility", event.target.value as FormState["visibility"])}><option value="PUBLIC">Public listing</option><option value="UNLISTED">Unlisted link</option></select></label>
          <label className="editor-span-2"><span>Accessibility and accommodation notes <small>Optional</small></span><textarea rows={4} maxLength={1000} value={form.accessibilityNotes} onChange={(event) => set("accessibilityNotes", event.target.value)} /></label>
        </div>
      </section>

      {error ? <div className="form-error" role="alert">{error}</div> : null}
      <div className="event-editor-actions">
        <Link className="button button-tertiary" href="/events/manage">Cancel</Link>
        <button className="button button-secondary" type="submit" name="action" value="DRAFT" disabled={Boolean(submitting)}><FilePenLine aria-hidden="true" />{submitting === "DRAFT" ? "Saving…" : "Save private draft"}</button>
        <button className="button button-primary" type="submit" name="action" value="PUBLISH" disabled={Boolean(submitting)}>{submitting === "PUBLISH" ? "Publishing…" : initial?.status === "PUBLISHED" ? "Update live event" : "Publish to live site"}<Send aria-hidden="true" /></button>
      </div>
      <p className="publish-disclosure"><Eye aria-hidden="true" /> Publishing does not imply endorsement by FlightForge, a course, the PDGA, or a registration provider.</p>
    </form>
  );
}

function initialState(email: string, event?: EventRecord): FormState {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setMinutes(0, 0, 0);
  const later = new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000);
  return {
    organizationName: event?.organizationName ?? "",
    eventType: event?.eventType ?? "TOURNAMENT",
    title: event?.title ?? "",
    summary: event?.summary ?? "",
    description: event?.description ?? "",
    courseId: event?.courseId ?? "",
    venueName: event?.venueName ?? "",
    addressLine1: event?.addressLine1 ?? "",
    city: event?.city ?? "",
    regionCode: event?.regionCode ?? "ME",
    startsAt: fromIso(event?.startsAt ?? tomorrow.toISOString()),
    endsAt: fromIso(event?.endsAt ?? later.toISOString()),
    registrationOpensAt: event?.registrationOpensAt ? fromIso(event.registrationOpensAt) : "",
    registrationClosesAt: event?.registrationClosesAt ? fromIso(event.registrationClosesAt) : "",
    registrationUrl: event?.registrationUrl ?? "",
    contactEmail: event?.contactEmail ?? email,
    capacity: event?.capacity ? String(event.capacity) : "",
    entryFee: event ? (event.entryFeeCents / 100).toFixed(2) : "0.00",
    format: event?.format ?? "",
    divisions: event?.divisions.join(", ") ?? "",
    accessibilityNotes: event?.accessibilityNotes ?? "",
    visibility: event?.visibility ?? "PUBLIC",
  };
}

function toIso(localDateTime: string): string {
  const date = new Date(localDateTime);
  return Number.isNaN(date.getTime()) ? localDateTime : date.toISOString();
}

function fromIso(iso: string): string {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
