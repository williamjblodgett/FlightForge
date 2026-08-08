import type { Metadata } from "next";
import Link from "next/link";
import { Bot, CalendarDays, CheckCircle2, Disc3, Flag, MapPinned, Play, Trophy, Users } from "lucide-react";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Product roadmap" };

const slices = [
  { id: "discover", icon: MapPinned, title: "Discovery & trust", status: "Available now", body: "Source-attributed course search, responsive map/list views, saved courses, operator claims, and administrator review." },
  { id: "booking", icon: CalendarDays, title: "Availability & booking", status: "Next slice", body: "Capacity-safe tee times, quote locking, free and paid reservations, group invitations, waitlists, and owner calendars." },
  { id: "play", icon: Play, title: "Rounds & hole highlights", status: "Scorecard preview live", body: "Mobile score entry now includes private, moderated video moments attached to specific event holes. Cross-device synchronization and complete statistics remain next." },
  { id: "events", icon: Trophy, title: "Tournaments", status: "Planned", body: "Registration, divisions, cards, starts, live standings, announcements, waitlists, and results." },
  { id: "leagues", icon: Users, title: "Regional leagues", status: "Planned", body: "Multi-course seasons, points, handicaps, drop weeks, attendance, schedules, and member communication." },
  { id: "bag", icon: Disc3, title: "Digital bag", status: "Planned", body: "Disc inventory, duplicate molds, stability gaps, course-specific bags, and equipment-aware recommendations." },
  { id: "caddie", icon: Bot, title: "AI caddie & coaching", status: "Planned with safety gates", body: "Explainable shot recommendations, owned-disc alternatives, structured confidence, consented media analysis, and provider fallbacks." },
  { id: "community", icon: Flag, title: "Community & learning", status: "Planned", body: "Public games, matchmaking controls, tutorials, drills, reviews, reporting, blocking, and moderation." },
];

export default function RoadmapPage() {
  return (
    <main className="roadmap-page page-shell">
      <header className="roadmap-heading"><span className="eyebrow">Built in complete slices</span><h1>The first tee, then the whole course.</h1><p>{brand.productName}’s architecture includes the wider platform while delivery stays focused on complete, testable player and operator journeys.</p><Link className="button button-primary" href="/courses">Explore the live slice</Link></header>
      <div className="roadmap-grid">{slices.map((slice, index) => { const Icon = slice.icon; return <article key={slice.id} id={slice.id}><div className="roadmap-icon"><Icon aria-hidden="true" /></div><span className={`roadmap-status${index === 0 ? " is-live" : ""}`}>{index === 0 ? <CheckCircle2 aria-hidden="true" /> : null}{slice.status}</span><h2>{slice.title}</h2><p>{slice.body}</p><span className="roadmap-number">{String(index + 1).padStart(2, "0")}</span></article>; })}</div>
    </main>
  );
}
