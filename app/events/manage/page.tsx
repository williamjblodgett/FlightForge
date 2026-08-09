import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus2, Eye, FilePenLine } from "lucide-react";
import { EventStatusControls } from "@/components/events/EventStatusControls";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { isFeatureEnabled } from "@/modules/config/feature-flags";
import { listManagedEvents } from "@/modules/events/event-repository";

export const dynamic = "force-dynamic";

export default async function ManageEventsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?return_to=%2Fevents%2Fmanage");
  if (!await isFeatureEnabled("event_publishing")) redirect("/events");
  if (!can(user, "manageEvents")) redirect("/events");
  const events = await listManagedEvents(user).catch(() => []);
  return <main className="manage-events-page page-shell"><section className="manage-events-heading"><div><span className="eyebrow">Coordinator workspace</span><h1>Event publishing</h1><p>Create, publish, update, unpublish, or cancel events for the courses you manage.</p></div><Link className="button button-primary" href="/events/new"><CalendarPlus2 aria-hidden="true" />New event</Link></section>{events.length ? <div className="managed-event-list">{events.map((event) => <article key={event.id}><div className="managed-event-main"><span className={`event-status ${event.status.toLowerCase()}`}>{event.status.toLowerCase()}</span><h2>{event.title}</h2><p>{formatDate(event.startsAt, event.timeZone)} · {event.venueName} · Updated {formatDate(event.updatedAt, event.timeZone)}</p><div><Link href={`/events/manage/${event.id}`}><FilePenLine aria-hidden="true" />Edit details</Link>{event.status !== "DRAFT" ? <Link href={`/events/${event.slug}`}><Eye aria-hidden="true" />View public page</Link> : null}</div></div><EventStatusControls event={event} /></article>)}</div> : <div className="event-state"><CalendarPlus2 aria-hidden="true" /><strong>No drafts or published events.</strong><p>Create the first organizer-owned event when the schedule is ready.</p><Link className="button button-primary" href="/events/new">Create an event</Link></div>}</main>;
}

function formatDate(value: string, timeZone: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone, timeZoneName: "short" }).format(new Date(value)); }
