import type { Metadata } from "next";
import Link from "next/link";
import { Bot, CalendarDays, CheckCircle2, Disc3, Flag, MapPinned, Play, Trophy, Users } from "lucide-react";

export const metadata: Metadata = { title: "Product roadmap" };

const slices = [
  { id: "discover", icon: MapPinned, title: "Course discovery", status: "Available now", live: true, body: "Responsive map and list views, saved courses, detailed listings, and course-management applications." },
  { id: "booking", icon: CalendarDays, title: "Availability & booking", status: "In development", live: false, body: "Capacity-safe tee times, quote locking, free and paid reservations, group invitations, waitlists, and owner calendars." },
  { id: "play", icon: Play, title: "Rounds & hole highlights", status: "Available now", live: true, body: "Offline-first mobile scoring, corrections, penalties, sync status, and moderated video moments attached to event holes." },
  { id: "events", icon: Trophy, title: "Events", status: "Publishing available", live: true, body: "Approved coordinators can create, preview, publish, update, and cancel events. Registration, cards, and live standings remain in development." },
  { id: "leagues", icon: Users, title: "Regional leagues", status: "Planned", body: "Multi-course seasons, points, handicaps, drop weeks, attendance, schedules, and member communication." },
  { id: "bag", icon: Disc3, title: "Digital bag", status: "Available now", live: true, body: "Track individual discs, wear, flight ratings, personal throw observations, bag gaps, and owned-disc caddie choices." },
  { id: "caddie", icon: Bot, title: "Caddie & camera coach", status: "Available beta", live: true, body: "Explainable owned-disc guidance, private caddie conversations, camera capture, on-device pose landmarks, confidence, and clear limitations." },
  { id: "learn", icon: Bot, title: "Learning center", status: "Planned", body: "Reviewed tutorials, drills, practice plans, accessible transcripts, and personalized learning paths." },
  { id: "community", icon: Flag, title: "Player community", status: "Available beta", live: true, body: "Adult-only curated course and regional channels, direct and private group conversations, privacy controls, blocking, reporting, and moderation." },
];

export default function RoadmapPage() {
  return (
    <main className="roadmap-page page-shell">
      <header className="roadmap-heading"><span className="eyebrow">What’s next</span><h1>The first tee, then the whole course.</h1><p>FlightForge is growing from course discovery into a complete home for playing, improving, competing, and running a course.</p><Link className="button button-primary" href="/courses">Explore courses</Link></header>
      <div className="roadmap-grid">{slices.map((slice, index) => { const Icon = slice.icon; return <article key={slice.id} id={slice.id}><div className="roadmap-icon"><Icon aria-hidden="true" /></div><span className={`roadmap-status${slice.live ? " is-live" : ""}`}>{slice.live ? <CheckCircle2 aria-hidden="true" /> : null}{slice.status}</span><h2>{slice.title}</h2><p>{slice.body}</p><span className="roadmap-number">{String(index + 1).padStart(2, "0")}</span></article>; })}</div>
    </main>
  );
}
