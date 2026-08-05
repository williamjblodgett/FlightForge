import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, CalendarPlus2, MapPin, ShieldCheck, Ticket, Trophy } from "lucide-react";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { isFeatureEnabled } from "@/modules/config/feature-flags";
import { listPublicEventBoard } from "@/modules/events/event-repository";
import type { EventRecord } from "@/modules/events/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Events", description: "Upcoming disc golf tournaments, leagues, clinics, fundraisers, and organized rounds." };

export default async function EventsPage() {
  const [user, result, eventPublishingEnabled] = await Promise.all([
    getCurrentUser(),
    listPublicEventBoard()
      .then((board) => ({ ...board, failed: false }))
      .catch(() => ({ upcoming: [] as EventRecord[], past: [] as EventRecord[], failed: true })),
    isFeatureEnabled("event_publishing"),
  ]);
  const { upcoming, past } = result;
  return <main className="events-page">
    <section className="events-hero">
      <div className="page-shell events-hero-inner">
        <div><span className="eyebrow"><Trophy aria-hidden="true" /> Live event board</span><h1>Show up ready.<br />Know what’s happening.</h1><p>Organizer-posted tournaments, leagues, clinics, and community rounds—published with clear dates, locations, registration details, and accountable ownership.</p></div>
        <div className="events-publish-card"><CalendarPlus2 aria-hidden="true" /><span>For organizers</span><h2>Post an event to FlightForge</h2><p>Authorized coordinators can save a private draft, preview the details, and publish directly to this board.</p>{!eventPublishingEnabled ? <p className="coordinator-note">Publishing is temporarily paused by a platform feature control.</p> : can(user, "manageEvents") ? <Link className="button button-primary" href="/events/new">Create an event <ArrowRight aria-hidden="true" /></Link> : user ? <p className="coordinator-note"><ShieldCheck aria-hidden="true" /> Coordinator access is verified before publishing.</p> : <Link className="button button-secondary" href="/sign-in?returnTo=%2Fevents%2Fnew">Coordinator sign in</Link>}</div>
      </div>
    </section>
    <section className="page-shell event-board">
      <div className="event-board-heading"><div><span className="eyebrow">Upcoming</span><h2>On the calendar</h2></div>{eventPublishingEnabled && can(user, "manageEvents") ? <Link className="button button-secondary" href="/events/manage">Manage my events</Link> : null}</div>
      {result.failed ? <div className="event-state error-state"><strong>The live event board is temporarily unavailable.</strong><p>No event data was replaced or lost. Try again shortly.</p></div> : upcoming.length ? <div className="public-event-grid">{upcoming.map((event) => <EventCard key={event.id} event={event} />)}</div> : <div className="event-state"><CalendarDays aria-hidden="true" /><strong>No public events have been posted yet.</strong><p>Authorized Maine coordinators can publish the first verified organizer listing.</p>{eventPublishingEnabled && can(user, "manageEvents") ? <Link className="button button-primary" href="/events/new">Post the first event</Link> : null}</div>}
      {past.length ? <section className="past-events"><span className="eyebrow">Recently completed</span><div>{past.map((event) => <Link key={event.id} href={`/events/${event.slug}`}><strong>{event.title}</strong><span>{formatDate(event.startsAt)} · {event.city}, {event.regionCode}</span></Link>)}</div></section> : null}
    </section>
  </main>;
}

function EventCard({ event }: { event: EventRecord }) {
  return <article className={`public-event-card ${event.status === "CANCELLED" ? "is-cancelled" : ""}`}>
    <div className="event-date-block"><span>{new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "America/New_York" }).format(new Date(event.startsAt))}</span><strong>{new Intl.DateTimeFormat("en-US", { day: "2-digit", timeZone: "America/New_York" }).format(new Date(event.startsAt))}</strong></div>
    <div className="event-card-content"><div className="event-card-kicker"><span>{event.eventType.replaceAll("_", " ").toLowerCase()}</span>{event.status === "CANCELLED" ? <b>Cancelled</b> : <b>Organizer posted</b>}</div><h3><Link href={`/events/${event.slug}`}>{event.title}</Link></h3><p>{event.summary}</p><div className="event-card-facts"><span><MapPin aria-hidden="true" />{event.venueName} · {event.city}, {event.regionCode}</span><span><Ticket aria-hidden="true" />{event.entryFeeCents ? `${formatMoney(event.entryFeeCents)} entry` : "Free entry"}{event.capacity ? ` · ${event.capacity} capacity` : ""}</span></div><div className="event-card-footer"><span>By {event.organizationName}</span><Link href={`/events/${event.slug}`}>Event details <ArrowRight aria-hidden="true" /></Link></div></div>
  </article>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" }).format(new Date(value)); }
function formatMoney(cents: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100); }
