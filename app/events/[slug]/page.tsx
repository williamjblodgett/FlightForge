import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ExternalLink, Mail, MapPin, PlayCircle, ShieldCheck, Ticket, Users } from "lucide-react";
import { getPublishedEventBySlug } from "@/modules/events/event-repository";
import { getCourseById } from "@/modules/courses/demo-courses";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug).catch(() => null);
  return event ? { title: event.title, description: event.summary, alternates: { canonical: `/events/${event.slug}` } } : {};
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug).catch(() => null);
  if (!event) notFound();
  const course = event.courseId ? getCourseById(event.courseId) : null;
  const structuredData = { "@context": "https://schema.org", "@type": "SportsEvent", name: event.title, description: event.summary, startDate: event.startsAt, endDate: event.endsAt, eventStatus: event.status === "CANCELLED" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled", location: { "@type": "Place", name: event.venueName, address: { "@type": "PostalAddress", streetAddress: event.addressLine1 ?? undefined, addressLocality: event.city, addressRegion: event.regionCode, addressCountry: event.countryCode } }, organizer: { "@type": "Organization", name: event.organizationName, email: event.contactEmail }, offers: event.registrationUrl ? { "@type": "Offer", url: event.registrationUrl, price: event.entryFeeCents / 100, priceCurrency: event.currency, availability: "https://schema.org/InStock" } : undefined };
  const scorecardHref = `/play?eventId=${encodeURIComponent(event.id)}`;
  return <main className="event-detail-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }} /><section className="event-detail-hero"><div className="page-shell"><Link className="back-link" href="/events"><ArrowLeft aria-hidden="true" />All events</Link><div className="event-detail-kicker"><span>{event.eventType.replaceAll("_", " ")}</span><b><ShieldCheck aria-hidden="true" />Organizer posted</b></div><h1>{event.title}</h1><p>{event.summary}</p>{event.status === "CANCELLED" ? <div className="cancelled-notice" role="status"><strong>This event was cancelled by its organizer.</strong><p>{event.cancellationReason}</p></div> : null}</div></section><section className="page-shell event-detail-layout"><article className="event-detail-body"><h2>Event details</h2>{event.description.split(/\n{2,}/u).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{event.divisions.length ? <div className="division-list"><span>Divisions</span>{event.divisions.map((division) => <b key={division}>{division}</b>)}</div> : null}{event.accessibilityNotes ? <div className="accessibility-note"><strong>Accessibility and accommodations</strong><p>{event.accessibilityNotes}</p></div> : null}<div className="organizer-disclosure"><ShieldCheck aria-hidden="true" /><p>Published by {event.organizationName}. FlightForge displays organizer-supplied facts and does not imply course, PDGA, retailer, or governing-body endorsement.</p></div></article><aside className="event-detail-facts"><div><CalendarDays aria-hidden="true" /><span><small>Date and time</small><strong>{formatRange(event.startsAt, event.endsAt, event.timeZone)}</strong></span></div><div><MapPin aria-hidden="true" /><span><small>Location</small><strong>{event.venueName}</strong><p>{[event.addressLine1, event.city, event.regionCode].filter(Boolean).join(", ")}</p>{course ? <Link href={`/courses/${course.slug}`}>View course listing</Link> : null}</span></div><div><Ticket aria-hidden="true" /><span><small>Entry</small><strong>{event.entryFeeCents ? formatMoney(event.entryFeeCents) : "Free"}</strong><p>{event.format}</p></span></div>{event.capacity ? <div><Users aria-hidden="true" /><span><small>Capacity</small><strong>{event.capacity} participants</strong></span></div> : null}<div><Mail aria-hidden="true" /><span><small>Organizer</small><strong>{event.organizationName}</strong><a href={`mailto:${event.contactEmail}`}>{event.contactEmail}</a></span></div>{event.status === "PUBLISHED" ? <Link className="button button-secondary button-wide" href={scorecardHref}>Open scorecard <PlayCircle aria-hidden="true" /></Link> : null}{event.status === "PUBLISHED" && event.registrationUrl ? <a className="button button-primary button-wide" href={event.registrationUrl} target="_blank" rel="noreferrer">Open registration <ExternalLink aria-hidden="true" /></a> : null}</aside></section></main>;
}

function formatRange(start: string, end: string, timeZone: string) { const formatter = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone, timeZoneName: "short" }); return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`; }
function formatMoney(cents: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100); }
