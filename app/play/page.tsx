import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronRight, Clock3, MapPinned, PlayCircle, RotateCcw } from "lucide-react";
import { notFound } from "next/navigation";
import { LiveRoundScorecard } from "@/components/rounds/LiveRoundScorecard";
import { getCurrentUser } from "@/modules/auth/current-user";
import { getCourseById, fictionalDemoCourse } from "@/modules/courses/demo-courses";
import { getPublishedEventById, listPublishedEvents } from "@/modules/events/event-repository";
import { listHoleHighlights } from "@/modules/highlights/highlight-repository";
import { getOrCreateActiveRound, listActiveRoundSummaries } from "@/modules/rounds/round-repository";
import "./play.css";

export const metadata: Metadata = { title: "Live scorecard", description: "Score a round and watch moderated community videos attached to individual holes." };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PlayPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const query = await searchParams;
  const eventId = safeIdentifier(query.eventId);
  if (!eventId) {
    const [activeRounds, publishedEvents] = await Promise.all([
      user ? listActiveRoundSummaries(user).catch(() => []) : Promise.resolve([]),
      listPublishedEvents().catch(() => []),
    ]);
    return <main className="play-page page-shell">
      <header className="play-launch-header"><span className="eyebrow"><PlayCircle aria-hidden="true" /> Field mode</span><h1>Play your round, even when service drops.</h1><p>Open a scorecard, keep every throw safe on this device, and synchronize automatically when your connection returns.</p></header>
      {activeRounds.length ? <section className="resume-rounds" aria-labelledby="resume-title"><div className="play-section-heading"><div><span className="eyebrow"><RotateCcw aria-hidden="true" /> Continue where you left off</span><h2 id="resume-title">Active rounds</h2></div><span>{activeRounds.length} ready to resume</span></div><div className="resume-round-grid">{activeRounds.map((round) => <Link key={round.id} href={`/play?eventId=${encodeURIComponent(round.eventId)}`}><span>{round.completedHoles}/{round.holeCount} holes</span><h3>{round.eventTitle}</h3><p>{round.venueName}</p><small><Clock3 aria-hidden="true" />Saved {new Date(round.updatedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</small><b>Resume scorecard <ChevronRight aria-hidden="true" /></b></Link>)}</div></section> : null}
      <section className="play-start-options" aria-labelledby="start-round-title"><div className="play-section-heading"><div><span className="eyebrow">Start a round</span><h2 id="start-round-title">Choose how you’re playing today.</h2></div></div><div className="play-option-grid"><Link className="play-option-card is-primary" href="/events"><CalendarDays aria-hidden="true" /><span><strong>Event scorecard</strong><small>Open a tournament, league, or casual event.</small></span><ChevronRight aria-hidden="true" /></Link><Link className="play-option-card" href="/courses"><MapPinned aria-hidden="true" /><span><strong>Find your course</strong><small>Check layouts and plan where to play.</small></span><ChevronRight aria-hidden="true" /></Link><Link className="play-option-card" href="/play?eventId=flightforge-demo-event"><PlayCircle aria-hidden="true" /><span><strong>Try the field demo</strong><small>Practice scoring on a clearly labeled fictional round.</small></span><ChevronRight aria-hidden="true" /></Link></div></section>
      {publishedEvents.some((event) => event.status === "PUBLISHED") ? <section className="play-event-strip" aria-labelledby="available-events-title"><div className="play-section-heading"><div><span className="eyebrow">Available now</span><h2 id="available-events-title">Published event scorecards</h2></div></div><div>{publishedEvents.filter((event) => event.status === "PUBLISHED").slice(0, 4).map((event) => <Link key={event.id} href={`/play?eventId=${encodeURIComponent(event.id)}`}><span>{event.eventType.toLowerCase()}</span><strong>{event.title}</strong><small>{event.venueName}</small><ChevronRight aria-hidden="true" /></Link>)}</div></section> : null}
      {!user ? <aside className="play-sign-in-note"><strong>Want rounds on every device?</strong><p>You can score locally now. Sign in to synchronize corrections and round history securely.</p><Link className="button button-primary" href={`/sign-in?return_to=${encodeURIComponent("/play")}`}>Sign in to play</Link></aside> : null}
    </main>;
  }
  const event = await getPublishedEventById(eventId).catch(() => null);
  if (!event?.courseId) notFound();
  const course = getCourseById(event.courseId) ?? (event.courseId === fictionalDemoCourse.id ? fictionalDemoCourse : null);
  if (!course) notFound();
  const [highlights, activeRound] = await Promise.all([
    listHoleHighlights(event.courseId, event.id, user).catch(() => []),
    user ? getOrCreateActiveRound(user, event).catch(() => null) : Promise.resolve(null),
  ]);
  return <main className="play-page page-shell"><LiveRoundScorecard courseId={event.courseId} eventId={event.id} eventTitle={event.title} courseName={course.name} holeCount={event.holeCount} isSignedIn={Boolean(user)} offlineOwnerScope={user?.id ?? "guest"} initialHighlights={highlights} initialRound={activeRound} /></main>;
}

function safeIdentifier(value: string | string[] | undefined): string | null {
  return typeof value === "string" && /^[a-zA-Z0-9:_-]{2,120}$/u.test(value) ? value : null;
}
