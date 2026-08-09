import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPinned, PlayCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/current-user";
import { getCourseById, fictionalDemoCourse } from "@/modules/courses/demo-courses";
import { getPublishedEventById } from "@/modules/events/event-repository";
import { HoleHighlightScorecard } from "@/modules/highlights/HoleHighlightScorecard";
import { listHoleHighlights } from "@/modules/highlights/highlight-repository";
import { getOrCreateActiveRound } from "@/modules/rounds/round-repository";

export const metadata: Metadata = { title: "Live scorecard", description: "Score a round and watch moderated community videos attached to individual holes." };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PlayPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const query = await searchParams;
  const eventId = safeIdentifier(query.eventId);
  if (!eventId) {
    return <main className="play-page page-shell">
      <section className="event-state play-start-state">
        <PlayCircle aria-hidden="true" />
        <strong>Ready for your next round?</strong>
        <p>Choose an event to open its live scorecard, or find a course and plan where to play.</p>
        <div className="play-start-actions">
          <Link className="button button-primary" href="/events"><CalendarDays aria-hidden="true" />Browse events</Link>
          <Link className="button button-secondary" href="/courses"><MapPinned aria-hidden="true" />Find a course</Link>
        </div>
      </section>
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
  return <main className="play-page page-shell"><HoleHighlightScorecard courseId={event.courseId} eventId={event.id} eventTitle={event.title} courseName={course.name} holeCount={event.holeCount} isSignedIn={Boolean(user)} initialHighlights={highlights} initialRound={activeRound} /></main>;
}

function safeIdentifier(value: string | string[] | undefined): string | null {
  return typeof value === "string" && /^[a-zA-Z0-9:_-]{2,120}$/u.test(value) ? value : null;
}
