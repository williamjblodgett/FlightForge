import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Check, ChevronLeft, ChevronRight, CloudOff, CloudSun, Lock, Minus, Plus, RefreshCw, Users } from "lucide-react";
import { confirmBooking, createBookingQuote, type BookingVisibility } from "@/modules/bookings/booking-engine";
import { courses } from "@/modules/courses/demo-courses";
import { createRound, recordHoleScore, summarizeRound } from "@/modules/rounds/round-engine";
import { useDemoStore } from "../demo-store";

type PlayTab = "BOOK" | "GROUPS" | "SCORE";

const teeSlots = [
  { time: "09:20", remaining: 4 },
  { time: "10:40", remaining: 2 },
  { time: "12:00", remaining: 1 },
  { time: "14:20", remaining: 4 },
  { time: "16:00", remaining: 0 },
];

export function PlayScreen() {
  const { state } = useDemoStore();
  const [tab, setTab] = useState<PlayTab>(state.activeRoundId ? "SCORE" : "BOOK");
  return (
    <div className="screen play-screen">
      <section className="screen-title compact-title">
        <div><span className="demo-eyebrow"><CalendarCheck aria-hidden="true" /> Round control</span><h1>Book it. Find your card. Play through.</h1><p>The active-round experience keeps the essential action thumb-reachable and saves every score locally.</p></div>
      </section>
      <div className="segmented-control" role="tablist" aria-label="Play tools">
        <button type="button" role="tab" aria-selected={tab === "BOOK"} onClick={() => setTab("BOOK")}>Book</button>
        <button type="button" role="tab" aria-selected={tab === "GROUPS"} onClick={() => setTab("GROUPS")}>Groups</button>
        <button type="button" role="tab" aria-selected={tab === "SCORE"} onClick={() => setTab("SCORE")}>Score</button>
      </div>
      {tab === "BOOK" ? <BookingPanel /> : tab === "GROUPS" ? <GroupsPanel /> : <ScorePanel />}
    </div>
  );
}

function BookingPanel() {
  const { state, update } = useDemoStore();
  const participatingCourse = courses.find((course) => course.fictionalDemo) ?? courses[0];
  const [date, setDate] = useState(nextSaturday());
  const [time, setTime] = useState("14:20");
  const [players, setPlayers] = useState(2);
  const [visibility, setVisibility] = useState<BookingVisibility>("PUBLIC");
  const [member, setMember] = useState(false);
  const [status, setStatus] = useState("");
  const slot = teeSlots.find((item) => item.time === time) ?? teeSlots[0];
  const quote = useMemo(() => {
    if (!participatingCourse || !slot || slot.remaining === 0 || players > slot.remaining) return null;
    return createBookingQuote({
      courseId: participatingCourse.id,
      date,
      time,
      playerCount: players,
      remainingCapacity: slot.remaining,
      unitPriceCents: participatingCourse.priceFromCents ?? 1200,
      isMember: member,
      weatherRisk: time === "16:00" ? "RAIN_LIKELY" : "NONE",
    });
  }, [date, member, participatingCourse, players, slot, time]);

  const submit = () => {
    if (!quote) {
      setStatus("This group does not fit. Join the waitlist or select another time.");
      return;
    }
    const idempotencyKey = [quote.courseId, quote.date, quote.time, quote.playerCount, visibility].join(":");
    const reservation = confirmBooking({
      quote,
      idempotencyKey,
      visibility,
      existingReservations: state.reservations,
    });
    update((current) => ({
      ...current,
      reservations: current.reservations.some((item) => item.id === reservation.id)
        ? current.reservations
        : [reservation, ...current.reservations],
      notificationCount: current.notificationCount + 1,
    }));
    setStatus(`Confirmed for ${players} player${players === 1 ? "" : "s"}. The same submission cannot create a duplicate reservation.`);
  };

  return (
    <section className="workspace-grid booking-workspace">
      <div className="workspace-card form-card">
        <div className="card-heading"><span className="step-number">1</span><div><h2>Choose your tee time</h2><p>Only the clearly fictional Forge Ridge property accepts demo bookings.</p></div></div>
        <div className="selected-course-row"><span className="course-mini-art granite">FR</span><div><strong>{participatingCourse?.name}</strong><span>{participatingCourse?.city}, {participatingCourse?.state} · Ridge 18</span></div><span className="verified-pill">Demo verified</span></div>
        <div className="form-grid two">
          <label><span>Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label><span>Players</span><select value={players} onChange={(event) => setPlayers(Number(event.target.value))}>{[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count} player{count === 1 ? "" : "s"}</option>)}</select></label>
        </div>
        <fieldset className="time-grid"><legend>Available times</legend>{teeSlots.map((item) => <button key={item.time} type="button" className={time === item.time ? "selected" : ""} onClick={() => setTime(item.time)}><strong>{formatTime(item.time)}</strong><span>{item.remaining === 0 ? "Waitlist" : `${item.remaining} open`}</span></button>)}</fieldset>
        <fieldset className="visibility-choice"><legend>Group visibility</legend><label><input type="radio" name="visibility" checked={visibility === "PUBLIC"} onChange={() => setVisibility("PUBLIC")} /><span><Users />Public group<small>Compatible players can request to join</small></span></label><label><input type="radio" name="visibility" checked={visibility === "PRIVATE"} onChange={() => setVisibility("PRIVATE")} /><span><Lock />Private group<small>Only invited players can access it</small></span></label></fieldset>
        <label className="check-row"><input type="checkbox" checked={member} onChange={(event) => setMember(event.target.checked)} /><span>Apply fictional Forge Ridge member pricing</span></label>
      </div>
      <aside className="workspace-card quote-card">
        <span className="demo-eyebrow">Price preview</span><h2>{formatDate(date)} · {formatTime(time)}</h2>
        {quote ? <><div className="quote-lines"><div><span>Players</span><strong>{players} × ${((quote.unitPriceCents) / 100).toFixed(2)}</strong></div><div><span>Base subtotal</span><strong>${(quote.subtotalCents / 100).toFixed(2)}</strong></div>{quote.explanation.map((line) => <div key={line}><span>{line}</span></div>)}</div><div className="quote-total"><span>Total due</span><strong>${(quote.totalCents / 100).toFixed(2)}</strong></div><p className="quote-note"><Check />Final total shown before confirmation. Quote remains fixed for ten minutes.</p><button className="demo-button primary wide" type="button" onClick={submit}>Confirm demo reservation</button></> : <><div className="waitlist-box"><Users /><h3>{slot?.remaining === 0 ? "This slot is full" : `Only ${slot?.remaining ?? 0} seat remains`}</h3><p>Waitlist promotion would honor party-size matching and an acceptance deadline.</p></div><button className="demo-button secondary wide" type="button" onClick={() => setStatus("Added to the local demo waitlist. No real notification will be sent.")}>Join demo waitlist</button></>}
        {status ? <p className="success-message" role="status">{status}</p> : null}
        <p className="demo-disclosure">No payment is collected. Stripe remains disabled until a verified operator and marketplace configuration are present.</p>
      </aside>
    </section>
  );
}

function GroupsPanel() {
  const { state, update } = useDemoStore();
  const [status, setStatus] = useState("");
  const toggleJoin = (gameId: string) => update((current) => ({
    ...current,
    games: current.games.map((game) => game.id === gameId ? { ...game, joined: !game.joined, seatsOpen: game.joined ? game.seatsOpen + 1 : Math.max(0, game.seatsOpen - 1) } : game),
    notificationCount: current.notificationCount + 1,
  }));
  const createGame = () => {
    const id = `game-${Date.now()}`;
    update((current) => ({ ...current, games: [{ id, courseId: courses[8]?.id ?? courses[0]?.id ?? "", startsAt: new Date(Date.now() + 3 * 86400000).toISOString(), seatsOpen: 3, pace: "RELAXED", skill: "Any skill", approvalRequired: true, joined: true }, ...current.games] }));
    setStatus("Private-approval group created locally. Share links are disabled in the static demo.");
  };
  return (
    <section className="groups-layout">
      <div className="section-heading-row"><div><span className="demo-eyebrow">Social matching</span><h2>Nearby groups with clear expectations</h2><p>Matches use time, pace, skill preference, and safety controls—never protected characteristics.</p></div><button className="demo-button primary" type="button" onClick={createGame}>Create a group</button></div>
      {status ? <p className="inline-status" role="status">{status}</p> : null}
      <div className="group-grid">{state.games.map((game) => { const course = courses.find((item) => item.id === game.courseId); return <article key={game.id} className="group-card"><div className="group-card-top"><span className="avatar-stack"><i>MC</i><i>TB</i><i>+</i></span><span className="seats-pill">{game.seatsOpen} seat{game.seatsOpen === 1 ? "" : "s"}</span></div><h3>{course?.name ?? "Maine course"}</h3><p>{new Date(game.startsAt).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p><div className="tag-row"><span>{game.skill}</span><span>{game.pace.toLowerCase()} pace</span><span>{game.approvalRequired ? "Host approval" : "Instant join"}</span></div><div className="group-safety"><ShieldIcon />Blocked users cannot view or join this group.</div><button className={`demo-button ${game.joined ? "secondary" : "primary"} wide`} type="button" onClick={() => toggleJoin(game.id)}>{game.joined ? "Leave group" : game.approvalRequired ? "Request to join" : "Join group"}</button></article>; })}</div>
    </section>
  );
}

function ScorePanel() {
  const { state, update, hydrated } = useDemoStore();
  const [online, setOnline] = useState(navigator.onLine);
  const [holeIndex, setHoleIndex] = useState(0);
  const active = state.rounds.find((round) => round.id === state.activeRoundId) ?? null;
  useEffect(() => { const sync = () => setOnline(navigator.onLine); window.addEventListener("online", sync); window.addEventListener("offline", sync); return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); }; }, []);
  const startRound = () => {
    const course = courses.find((item) => item.fictionalDemo) ?? courses[0];
    if (!course) return;
    const round = createRound(`round-${Date.now()}`, course.id, [3, 3, 4, 3, 3, 4, 3, 4, 3]);
    update((current) => ({ ...current, rounds: [round, ...current.rounds], activeRoundId: round.id }));
    setHoleIndex(0);
  };
  const changeScore = (delta: number) => {
    if (!active) return;
    const hole = active.holes[holeIndex];
    if (!hole) return;
    const nextScore = Math.min(20, Math.max(1, (hole.score ?? hole.par) + delta));
    const updated = recordHoleScore(active, hole.hole, nextScore, active.version);
    update((current) => ({ ...current, rounds: current.rounds.map((round) => round.id === updated.id ? updated : round), activeRoundId: updated.status === "COMPLETED" ? null : updated.id }));
  };
  if (!active) {
    const completed = state.rounds.filter((round) => round.status === "COMPLETED");
    return <section className="score-empty"><span className="score-basket" aria-hidden="true">◎</span><h2>{completed.length > 0 ? "Round saved" : "Ready for hole one?"}</h2><p>Start a nine-hole demo round. Every entry is preserved on this device, including while offline.</p><button className="demo-button primary" type="button" onClick={startRound}>Start demo round</button>{completed[0] ? <RoundSummaryCard round={completed[0]} /> : null}</section>;
  }
  const hole = active.holes[holeIndex];
  const summary = summarizeRound(active);
  return (
    <section className="scorecard-shell">
      <div className="score-status-bar"><span className={online ? "online" : "offline"}>{online ? <CloudSun /> : <CloudOff />}{online ? "Online" : "Offline"}</span><span><RefreshCw />0 pending cloud sync · local save active</span><span>{hydrated ? "Device state restored" : "Restoring…"}</span></div>
      <div className="hole-header"><button type="button" onClick={() => setHoleIndex((index) => Math.max(0, index - 1))} disabled={holeIndex === 0} aria-label="Previous hole"><ChevronLeft /></button><div><span>Hole</span><strong>{hole?.hole}</strong><small>Par {hole?.par} · 284 ft</small></div><button type="button" onClick={() => setHoleIndex((index) => Math.min(active.holes.length - 1, index + 1))} disabled={holeIndex === active.holes.length - 1} aria-label="Next hole"><ChevronRight /></button></div>
      <div className="score-entry"><span>Your score</span><div><button type="button" onClick={() => changeScore(-1)} aria-label="Subtract one stroke"><Minus /></button><strong>{hole?.score ?? hole?.par}</strong><button type="button" onClick={() => changeScore(1)} aria-label="Add one stroke"><Plus /></button></div><small>{hole?.score == null ? "Not recorded" : scoreLabel((hole.score ?? hole.par) - (hole?.par ?? 0))}</small></div>
      <div className="round-progress"><div><span>Round</span><strong>{summary.totalStrokes} strokes · {formatRelative(summary.relativeToPar)}</strong></div><div><span>Completed</span><strong>{summary.completedHoles}/{active.holes.length} holes</strong></div><div><span>Card</span><strong>Solo practice</strong></div></div>
      <div className="hole-strip" aria-label="Hole scores">{active.holes.map((item, index) => <button key={item.hole} type="button" className={index === holeIndex ? "active" : ""} onClick={() => setHoleIndex(index)}><span>{item.hole}</span><strong>{item.score ?? "–"}</strong></button>)}</div>
      <p className="score-help">Tip: score corrections create a new local revision. A future server sync can resolve per-hole conflicts without discarding either copy.</p>
    </section>
  );
}

function RoundSummaryCard({ round }: { round: ReturnType<typeof createRound> }) {
  const summary = summarizeRound(round);
  return <div className="mini-summary"><span>Latest result</span><strong>{summary.totalStrokes} · {formatRelative(summary.relativeToPar)}</strong><small>{summary.birdies} birdies · {summary.pars} pars · App-recorded demo</small></div>;
}

function formatRelative(value: number) { return value === 0 ? "E" : value > 0 ? `+${value}` : String(value); }
function scoreLabel(value: number) { return value <= -2 ? "Eagle or better" : value === -1 ? "Birdie" : value === 0 ? "Par" : value === 1 ? "Bogey" : `+${value}`; }
function formatTime(value: string) { const [hourValue, minutes] = value.split(":"); const hour = Number(hourValue); return `${hour > 12 ? hour - 12 : hour || 12}:${minutes} ${hour >= 12 ? "PM" : "AM"}`; }
function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); }
function nextSaturday() { const date = new Date(); const delta = (6 - date.getDay() + 7) % 7 || 7; date.setDate(date.getDate() + delta); return date.toISOString().slice(0, 10); }
function ShieldIcon() { return <span aria-hidden="true">✓</span>; }
