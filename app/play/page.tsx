import type { Metadata } from "next";
import { getCurrentUser } from "@/modules/auth/current-user";
import { HoleHighlightScorecard } from "@/modules/highlights/HoleHighlightScorecard";
import { listHoleHighlights } from "@/modules/highlights/highlight-repository";

export const metadata: Metadata = { title: "Live scorecard", description: "Score a round and watch moderated community videos attached to individual holes." };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PlayPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const query = await searchParams;
  const courseId = safeIdentifier(query.courseId) ?? "flightforge-demo-course";
  const eventId = safeIdentifier(query.eventId) ?? "flightforge-demo-event";
  const eventTitle = safeLabel(query.eventTitle) ?? "Pine State Open · Round 1";
  const courseName = safeLabel(query.courseName) ?? "FlightForge demonstration course";
  const highlights = await listHoleHighlights(courseId, eventId, user).catch(() => []);
  return <main className="play-page page-shell"><HoleHighlightScorecard courseId={courseId} eventId={eventId} eventTitle={eventTitle} courseName={courseName} isSignedIn={Boolean(user)} initialHighlights={highlights} /></main>;
}

function safeIdentifier(value: string | string[] | undefined): string | null {
  return typeof value === "string" && /^[a-zA-Z0-9:_-]{2,120}$/u.test(value) ? value : null;
}
function safeLabel(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.trim().length >= 2 && value.trim().length <= 120 ? value.trim() : null;
}
