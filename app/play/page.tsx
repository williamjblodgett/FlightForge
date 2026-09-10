import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronRight, Clock3, Crosshair, MapPinned, PlayCircle, RotateCcw } from "lucide-react";
import { getRoundForUser } from "@/modules/rounds/history-repository";
import { snapshotRoundContext } from "@/modules/rounds/round-context";
import { notFound, redirect } from "next/navigation";
import { LiveRoundScorecard } from "@/components/rounds/LiveRoundScorecard";
import { isPlayerReady } from "@/modules/auth/player-readiness";
import { nextAuthDestination } from "@/modules/auth/continuation";
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
  const roundId = safeIdentifier(query.roundId);
  if (user && (roundId || eventId) && !isPlayerReady(user)) redirect(nextAuthDestination(user, roundId ? `/play?roundId=${roundId}` : `/play?eventId=${eventId}`));
  if (roundId) {
    if (!user) redirect(`/sign-in?return_to=${encodeURIComponent(`/play?roundId=${roundId}`)}`);
    const detail = await getRoundForUser(user, roundId);
    if (!detail) notFound();
    if (detail.status === "COMPLETED") redirect(`/rounds/${roundId}`);
    const c = detail.context;
    const highlights = c.kind === "PERSONAL" ? [] : await listHoleHighlights(c.courseId,c.id,user).catch(()=>[]);
    return <main className="play-page page-shell"><LiveRoundScorecard courseId={c.courseId} eventId={c.id} eventTitle={c.title} courseName={c.venueName} holeCount={c.holeCount} holePars={c.pars} personal={c.kind === "PERSONAL"} roundPath={`/play?roundId=${roundId}`} isSignedIn={true} offlineOwnerScope={user.id} initialHighlights={highlights} initialRound={detail.round}/></main>;
  }
  if (!eventId) {
    const [activeRounds, publishedEvents] = await Promise.all([
      user ? listActiveRoundSummaries(user).catch(() => []) : Promise.resolve([]),
      listPublishedEvents().catch(() => []),
    ]);
    return <main className="play-page page-shell">
      <header className="play-launch-header"><span className="eyebrow"><PlayCircle aria-hidden="true" /> Field mode</span><h1>Ready to play?</h1><p>Start at a course or resume your saved scorecard.</p></header>
      {activeRounds.length ? <section className="resume-rounds" aria-labelledby="resume-title"><div className="play-section-heading"><div><span className="eyebrow"><RotateCcw aria-hidden="true" /> Continue where you left off</span><h2 id="resume-title">Active rounds</h2></div><span>{activeRounds.length} ready to resume</span></div><div className="resume-round-grid">{activeRounds.map((round) => <Link key={round.id} href={`/play?roundId=${round.id}`}><span>{round.completedHoles}/{round.holeCount} holes</span><h3>{round.eventTitle}</h3><p>{round.venueName}</p><small><Clock3 aria-hidden="true" />Saved {new Date(round.updatedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</small><b>Resume scorecard <ChevronRight aria-hidden="true" /></b></Link>)}</div></section> : null}
      <section className="play-start-options" aria-labelledby="start-round-title">
        <div className="play-section-heading"><div><span className="eyebrow">Start a round</span><h2 id="start-round-title">Choose how you’re playing today.</h2></div></div>
        <div className="play-option-grid">
          <Link className="play-option-card is-primary" href="/courses"><MapPinned aria-hidden="true"/><span><strong>Course round</strong><small>Choose a course and start your own scorecard.</small></span><ChevronRight aria-hidden="true"/></Link>
          <Link className="play-option-card" href="/events"><CalendarDays aria-hidden="true"/><span><strong>Event scorecard</strong><small>Open a published tournament or league event.</small></span><ChevronRight aria-hidden="true"/></Link>
          <Link className="play-option-card" href="/fieldwork"><Crosshair aria-hidden="true"/><span><strong>Fieldwork</strong><small>Find practice space and estimate throw distance.</small></span><ChevronRight aria-hidden="true"/></Link>
          <Link className="play-option-card" href="/play?eventId=flightforge-demo-event"><PlayCircle aria-hidden="true"/><span><strong>Try a demo round</strong><small>Practice scoring on a fictional course.</small></span><ChevronRight aria-hidden="true"/></Link>
        </div>
      </section>
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
  const context = activeRound?.context ?? await snapshotRoundContext(event);
  return <main className="play-page page-shell"><LiveRoundScorecard holePars={context.pars} courseId={context.courseId} eventId={context.id} eventTitle={context.title} courseName={context.venueName} holeCount={context.holeCount} isSignedIn={Boolean(user)} offlineOwnerScope={user?.id ?? "guest"} initialHighlights={highlights} initialRound={activeRound} /></main>;
}

function safeIdentifier(value: string | string[] | undefined): string | null {
  return typeof value === "string" && /^[a-zA-Z0-9:_-]{2,120}$/u.test(value) ? value : null;
}
