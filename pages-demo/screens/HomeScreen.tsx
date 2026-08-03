import { ArrowRight, CalendarCheck, CloudSun, Disc3, MapPinned, Sparkles, Trophy } from "lucide-react";
import { courses } from "@/modules/courses/demo-courses";
import { navigateTo } from "../App";
import { useDemoStore } from "../demo-store";

export function HomeScreen() {
  const { state } = useDemoStore();
  const featured = courses.find((course) => course.fictionalDemo) ?? courses[0];
  const activeRound = state.rounds.find((round) => round.id === state.activeRoundId);
  const nextReservation = state.reservations[0];
  const nextCourse = nextReservation
    ? courses.find((course) => course.id === nextReservation.courseId)
    : featured;

  return (
    <div className="screen screen-home">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="demo-eyebrow"><MapPinned aria-hidden="true" /> Maine is the first tee</span>
          <h1>Every round, one clear line forward.</h1>
          <p>Discover a course, reserve a tee time, find your group, keep score offline, and make a smarter next throw—all in one practical disc golf workspace.</p>
          <div className="hero-actions">
            <button className="demo-button primary" type="button" onClick={() => navigateTo("discover")}>Explore courses <ArrowRight aria-hidden="true" /></button>
            <button className="demo-button glass" type="button" onClick={() => navigateTo("play")}>{activeRound ? "Continue round" : "Start a round"}</button>
          </div>
          <div className="hero-proof" aria-label="Product summary">
            <div><strong>9</strong><span>Maine demo listings</span></div>
            <div><strong>Offline</strong><span>Round scoring</span></div>
            <div><strong>Explainable</strong><span>Caddie guidance</span></div>
          </div>
        </div>
        <div className="hero-command-card">
          <div className="hero-card-top"><span>Today at a glance</span><span className="live-dot">Device ready</span></div>
          <div className="weather-row"><CloudSun aria-hidden="true" /><div><strong>72° · W 9 mph</strong><span>Good scoring window after 2 PM</span></div></div>
          <div className="command-divider" />
          <span className="mini-label">Suggested round</span>
          <h2>{nextCourse?.name}</h2>
          <p>{nextCourse?.city}, {nextCourse?.state} · {nextCourse?.holeCount} holes · {nextCourse?.difficulty.toLowerCase()}</p>
          <button className="text-action" type="button" onClick={() => navigateTo("play")}><CalendarCheck aria-hidden="true" /> Review tee-time options</button>
          <div className="command-divider" />
          <div className="sync-row"><span><span className="sync-dot" />Local data saved</span><span>{state.lastSavedAt ? "Just now" : "Ready"}</span></div>
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading-row">
          <div><span className="demo-eyebrow">Your launchpad</span><h2>What do you want to do?</h2></div>
        </div>
        <div className="quick-grid">
          <button type="button" onClick={() => navigateTo("play")}><span className="quick-icon lime"><CalendarCheck /></span><strong>Book a round</strong><small>Transparent demo pricing and capacity-safe confirmation</small><ArrowRight /></button>
          <button type="button" onClick={() => navigateTo("play")}><span className="quick-icon amber"><Disc3 /></span><strong>Keep score</strong><small>One-handed controls with offline device persistence</small><ArrowRight /></button>
          <button type="button" onClick={() => navigateTo("bag")}><span className="quick-icon blue"><Sparkles /></span><strong>Ask the caddie</strong><small>Owned-disc guidance with reasoning and confidence</small><ArrowRight /></button>
          <button type="button" onClick={() => navigateTo("events")}><span className="quick-icon rose"><Trophy /></span><strong>Find competition</strong><small>Register for events and follow league standings</small><ArrowRight /></button>
        </div>
      </section>

      <section className="home-section pulse-section">
        <div className="section-heading-row">
          <div><span className="demo-eyebrow">Built for the whole course</span><h2>Player simplicity. Operator depth.</h2></div>
          <button className="text-link" type="button" onClick={() => navigateTo("owner")}>Open owner tools <ArrowRight /></button>
        </div>
        <div className="pulse-grid">
          <article><span>Discovery</span><strong>Search facts you can trust</strong><p>Every real listing carries its source, reviewed date, and operator-verification state.</p></article>
          <article><span>Play</span><strong>Keep moving through weak signal</strong><p>Scores, bag data, and demo reservations persist directly on this device.</p></article>
          <article><span>Improve</span><strong>One useful correction at a time</strong><p>Caddie guidance explains tradeoffs; media coaching remains gated until a real provider is configured.</p></article>
        </div>
      </section>
    </div>
  );
}
