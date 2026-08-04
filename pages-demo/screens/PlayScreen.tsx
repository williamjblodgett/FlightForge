import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  CloudSun,
  Disc3,
  Flag,
  Lock,
  MapPinned,
  Minus,
  NotebookPen,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Users,
  Wind,
  X,
} from "lucide-react";
import { confirmBooking, createBookingQuote, type BookingVisibility } from "@/modules/bookings/booking-engine";
import { fictionalDemoCourse, requireFictionalDemoCourse } from "@/modules/courses/fictional-demo-course";
import { createRound, recordHoleScore, summarizeRound } from "@/modules/rounds/round-engine";
import { navigateTo } from "../App";
import { useDemoStore, type DemoGame, type DemoHoleDetail } from "../demo-store";

type PlayTab = "BOOK" | "GROUPS" | "SCORE";

const demoCourse = requireFictionalDemoCourse(fictionalDemoCourse);
const teeSlots = [
  { time: "09:20", remaining: 4 },
  { time: "10:40", remaining: 2 },
  { time: "12:00", remaining: 1 },
  { time: "14:20", remaining: 4 },
  { time: "16:00", remaining: 0 },
];
const holeDistances = [284, 336, 418, 246, 302, 441, 228, 385, 274];

export function PlayScreen() {
  const { state } = useDemoStore();
  const [tab, setTab] = useState<PlayTab>(state.activeRoundId ? "SCORE" : "BOOK");
  return (
    <div className="screen play-screen">
      <section className="screen-title compact-title">
        <div><span className="demo-eyebrow"><CalendarCheck aria-hidden="true" /> Round control</span><h1>Book it. Find your card. Play through.</h1><p>The active-round experience keeps essential actions thumb-reachable and saves scores plus shot context locally.</p></div>
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
  const [date, setDate] = useState(nextSaturday());
  const [time, setTime] = useState("14:20");
  const [players, setPlayers] = useState(2);
  const [visibility, setVisibility] = useState<BookingVisibility>("PUBLIC");
  const [member, setMember] = useState(false);
  const [status, setStatus] = useState("");
  const slot = teeSlots.find((item) => item.time === time) ?? teeSlots[0]!;
  const idempotencyKey = [demoCourse.id, date, time, players, visibility].join(":");
  const confirmedReservation = state.reservations.find((reservation) => reservation.idempotencyKey === idempotencyKey);
  const quote = useMemo(() => {
    if (slot.remaining === 0 || players > slot.remaining) return null;
    return createBookingQuote({
      courseId: demoCourse.id,
      date,
      time,
      playerCount: players,
      remainingCapacity: slot.remaining,
      unitPriceCents: demoCourse.priceFromCents ?? 1200,
      isMember: member,
      weatherRisk: time === "16:00" ? "RAIN_LIKELY" : "NONE",
    });
  }, [date, member, players, slot, time]);

  const submit = () => {
    if (!quote) {
      setStatus("This group does not fit. Join the waitlist or select another time.");
      return;
    }
    const reservation = confirmBooking({ quote, idempotencyKey, visibility, existingReservations: state.reservations });
    update((current) => ({
      ...current,
      reservations: current.reservations.some((item) => item.id === reservation.id) ? current.reservations : [reservation, ...current.reservations],
      notificationCount: current.reservations.some((item) => item.id === reservation.id) ? current.notificationCount : current.notificationCount + 1,
    }));
    setStatus(`Confirmed for ${players} player${players === 1 ? "" : "s"}. This submission cannot create a duplicate reservation.`);
  };

  return (
    <section className="workspace-grid booking-workspace">
      <div className="workspace-card form-card">
        <div className="card-heading"><span className="step-number">1</span><div><h2>Choose your tee time</h2><p>Only the clearly fictional Forge Ridge fixture accepts preview bookings.</p></div></div>
        <div className="selected-course-row"><span className="course-mini-art granite">FR</span><div><strong>{demoCourse.name}</strong><span>{demoCourse.city}, {demoCourse.state} · Ridge 18</span></div><span className="verified-pill">Fictional fixture</span></div>
        <div className="form-grid two">
          <label><span>Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label><span>Players</span><select value={players} onChange={(event) => setPlayers(Number(event.target.value))}>{[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count} player{count === 1 ? "" : "s"}</option>)}</select></label>
        </div>
        <fieldset className="time-grid"><legend>Available times</legend>{teeSlots.map((item) => <button key={item.time} type="button" className={time === item.time ? "selected" : ""} aria-pressed={time === item.time} onClick={() => setTime(item.time)}><strong>{formatTime(item.time)}</strong><span>{item.remaining === 0 ? "Waitlist" : `${item.remaining} open`}</span></button>)}</fieldset>
        <fieldset className="visibility-choice"><legend>Group visibility</legend><label><input type="radio" name="visibility" checked={visibility === "PUBLIC"} onChange={() => setVisibility("PUBLIC")} /><span><Users aria-hidden="true" />Public group<small>Compatible players can request to join</small></span></label><label><input type="radio" name="visibility" checked={visibility === "PRIVATE"} onChange={() => setVisibility("PRIVATE")} /><span><Lock aria-hidden="true" />Private group<small>Only invited players can access it</small></span></label></fieldset>
        <label className="check-row"><input type="checkbox" checked={member} onChange={(event) => setMember(event.target.checked)} /><span>Apply fictional Forge Ridge member pricing</span></label>
      </div>
      <aside className="workspace-card quote-card">
        <span className="demo-eyebrow">Price preview</span><h2>{formatDate(date)} · {formatTime(time)}</h2>
        {quote ? <><div className="quote-lines"><div><span>Players</span><strong>{players} × ${(quote.unitPriceCents / 100).toFixed(2)}</strong></div><div><span>Base subtotal</span><strong>${(quote.subtotalCents / 100).toFixed(2)}</strong></div>{quote.explanation.map((line) => <div key={line}><span>{line}</span></div>)}</div><div className="quote-total"><span>Total due</span><strong>${(quote.totalCents / 100).toFixed(2)}</strong></div><p className="quote-note"><Check aria-hidden="true" />Final total shown before confirmation. Quote remains fixed for ten minutes.</p><button className="demo-button primary wide" type="button" onClick={submit} disabled={Boolean(confirmedReservation)}>{confirmedReservation ? <><Check aria-hidden="true" />Reservation confirmed</> : "Confirm demo reservation"}</button>{confirmedReservation ? <p className="reservation-reference">Reference {confirmedReservation.id.slice(-8)} · Saved on this device</p> : null}</> : <><div className="waitlist-box"><Users aria-hidden="true" /><h3>{slot.remaining === 0 ? "This slot is full" : `Only ${slot.remaining} seat remains`}</h3><p>Waitlist promotion would honor party-size matching and an acceptance deadline.</p></div><button className="demo-button secondary wide" type="button" onClick={() => setStatus("Added to the local demo waitlist. No real notification will be sent.")}>Join demo waitlist</button></>}
        {status ? <p className="success-message" role="status">{status}</p> : null}
        <p className="demo-disclosure">No payment is collected. No real course inventory, operator status, or calendar is affected.</p>
      </aside>
    </section>
  );
}

function GroupsPanel() {
  const { state, update } = useDemoStore();
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState("");
  const [date, setDate] = useState(nextSaturday());
  const [time, setTime] = useState("14:20");
  const [seats, setSeats] = useState(3);
  const [pace, setPace] = useState<DemoGame["pace"]>("RELAXED");
  const [skill, setSkill] = useState("Any skill");
  const [visibility, setVisibility] = useState<DemoGame["visibility"]>("PUBLIC");
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [notes, setNotes] = useState("Beginners welcome.");

  const toggleJoin = (gameId: string) => update((current) => ({
    ...current,
    games: current.games.map((game) => game.id === gameId && (game.joined || game.seatsOpen > 0) ? { ...game, joined: !game.joined, seatsOpen: game.joined ? game.seatsOpen + 1 : Math.max(0, game.seatsOpen - 1) } : game),
    notificationCount: current.notificationCount + 1,
  }));

  const createGame = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const startsAt = new Date(`${date}T${time}:00`).toISOString();
    const game: DemoGame = { id: `game-${Date.now()}`, courseId: demoCourse.id, startsAt, seatsOpen: seats, pace, skill, approvalRequired, visibility, notes: notes.trim(), joined: true };
    update((current) => ({ ...current, games: [game, ...current.games], notificationCount: current.notificationCount + 1 }));
    setShowForm(false);
    setStatus(`${visibility === "PRIVATE" ? "Private" : "Public"} group created for ${formatDate(date)} at ${formatTime(time)}.`);
  };

  return (
    <section className="groups-layout">
      <div className="section-heading-row"><div><span className="demo-eyebrow">Social matching</span><h2>Nearby groups with clear expectations</h2><p>Matches use time, pace, skill preference, and safety controls—never protected characteristics.</p></div><button className="demo-button primary" type="button" onClick={() => setShowForm((open) => !open)}>{showForm ? <><X aria-hidden="true" />Close form</> : <><Plus aria-hidden="true" />Create a group</>}</button></div>
      {showForm ? <form className="workspace-card create-group-form" onSubmit={createGame}><div className="form-grid two"><label><span>Course</span><select value={demoCourse.id} disabled><option value={demoCourse.id}>{demoCourse.name} · fictional</option></select></label><label><span>Date</span><input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} /></label><label><span>Time</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label><label><span>Open seats</span><select value={seats} onChange={(event) => setSeats(Number(event.target.value))}>{[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count}</option>)}</select></label><label><span>Preferred pace</span><select value={pace} onChange={(event) => setPace(event.target.value as DemoGame["pace"])}><option value="RELAXED">Relaxed</option><option value="STEADY">Steady</option><option value="FAST">Fast</option></select></label><label><span>Skill preference</span><select value={skill} onChange={(event) => setSkill(event.target.value)}><option>Any skill</option><option>Beginner-friendly</option><option>Similar skill</option><option>Competitive card</option></select></label><label><span>Visibility</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as DemoGame["visibility"])}><option value="PUBLIC">Public</option><option value="PRIVATE">Private</option></select></label><label className="check-row group-approval"><input type="checkbox" checked={approvalRequired} onChange={(event) => setApprovalRequired(event.target.checked)} /><span>Require host approval</span></label></div><label><span>Notes</span><textarea rows={3} maxLength={240} value={notes} onChange={(event) => setNotes(event.target.value)} /></label><button className="demo-button primary" type="submit">Create this group</button></form> : null}
      {status ? <p className="inline-status" role="status">{status}</p> : null}
      <div className="group-grid">{state.games.map((game) => <article key={game.id} className="group-card"><div className="group-card-top"><span className="avatar-stack"><i>MC</i><i>TB</i><i>+</i></span><span className="seats-pill">{game.seatsOpen} seat{game.seatsOpen === 1 ? "" : "s"}</span></div><span className="source-pill">{game.visibility.toLowerCase()} · fictional fixture</span><h3>{game.courseId === demoCourse.id ? demoCourse.name : "Unavailable demo fixture"}</h3><p>{new Date(game.startsAt).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p><div className="tag-row"><span>{game.skill}</span><span>{game.pace.toLowerCase()} pace</span><span>{game.approvalRequired ? "Host approval" : "Instant join"}</span></div>{game.notes ? <p className="group-notes">{game.notes}</p> : null}<div className="group-safety"><ShieldIcon />A production join checks blocks and capacity again on the server.</div><button className={`demo-button ${game.joined ? "secondary" : "primary"} wide`} type="button" disabled={!game.joined && game.seatsOpen === 0} onClick={() => toggleJoin(game.id)}>{game.joined ? "Leave group" : game.seatsOpen === 0 ? "Group full" : game.approvalRequired ? "Request to join" : "Join group"}</button></article>)}</div>
    </section>
  );
}

function ScorePanel() {
  const { state, update, hydrated } = useDemoStore();
  const [online, setOnline] = useState(navigator.onLine);
  const [holeIndex, setHoleIndex] = useState(0);
  const active = state.rounds.find((round) => round.id === state.activeRoundId) ?? null;

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);

  const startRound = () => {
    const round = createRound(`round-${Date.now()}`, demoCourse.id, [3, 3, 4, 3, 3, 4, 3, 4, 3]);
    update((current) => ({ ...current, rounds: [round, ...current.rounds], activeRoundId: round.id, roundDetails: { ...current.roundDetails, [round.id]: {} } }));
    setHoleIndex(0);
  };

  const changeScore = (delta: number) => {
    if (!active || active.status === "COMPLETED") return;
    const hole = active.holes[holeIndex];
    if (!hole) return;
    const nextScore = Math.min(20, Math.max(1, (hole.score ?? hole.par) + delta));
    const updated = recordHoleScore(active, hole.hole, nextScore, active.version);
    update((current) => ({ ...current, rounds: current.rounds.map((round) => round.id === updated.id ? updated : round), activeRoundId: updated.id }));
  };

  const updateDetail = (patch: Partial<DemoHoleDetail>) => {
    if (!active) return;
    const holeNumber = String(active.holes[holeIndex]?.hole ?? holeIndex + 1);
    update((current) => {
      const existing = current.roundDetails[active.id]?.[holeNumber] ?? emptyHoleDetail();
      return { ...current, roundDetails: { ...current.roundDetails, [active.id]: { ...current.roundDetails[active.id], [holeNumber]: { ...existing, ...patch } } } };
    });
  };

  if (!active) {
    const completed = state.rounds.filter((round) => round.status === "COMPLETED");
    return <section className="score-empty"><span className="score-basket" aria-hidden="true">◎</span><h2>{completed.length > 0 ? "Round saved" : "Ready for hole one?"}</h2><p>Start a nine-hole round at the fictional Forge Ridge fixture. Every entry is preserved on this device, including while offline.</p><button className="demo-button primary" type="button" onClick={startRound}>Start demo round</button>{completed[0] ? <RoundSummaryCard round={completed[0]} /> : null}</section>;
  }

  const hole = active.holes[holeIndex]!;
  const summary = summarizeRound(active);
  const detail = state.roundDetails[active.id]?.[String(hole.hole)] ?? emptyHoleDetail();
  return (
    <section className="scorecard-shell">
      <div className="score-course-context"><div><span className="demo-eyebrow"><MapPinned aria-hidden="true" /> Fictional active round</span><h2>{demoCourse.name}</h2><p>Ridge 18 · Hole {hole.hole} · {holeDistances[holeIndex]} ft</p></div><div className="round-weather"><Wind aria-hidden="true" /><span><strong>W 9 mph</strong><small>Demo weather · 72°F</small></span></div></div>
      <div className="score-status-bar"><span className={online ? "online" : "offline"}>{online ? <CloudSun aria-hidden="true" /> : <CloudOff aria-hidden="true" />}{online ? "Online" : "Offline"}</span><span><RefreshCw aria-hidden="true" />0 pending cloud sync · local save active</span><span>{hydrated ? "Device state restored" : "Restoring…"}</span></div>
      {active.status === "COMPLETED" ? <div className="round-ready-banner" role="status"><Check aria-hidden="true" /><div><strong>All holes are recorded.</strong><span>Review any score, then finish and save the round.</span></div></div> : null}
      <div className="hole-play-grid">
        <div className="hole-map-card" aria-label={`Illustrated fairway overview for hole ${hole.hole}`}><span className="tee-point">Tee</span><i className="fairway-line" /><span className="landing-zone"><Target aria-hidden="true" />Landing zone</span><span className="basket-point"><Flag aria-hidden="true" />Basket</span><small>Illustrative map · GPS estimate only</small></div>
        <div className="hole-score-card">
          <div className="hole-header"><button type="button" onClick={() => setHoleIndex((index) => Math.max(0, index - 1))} disabled={holeIndex === 0} aria-label="Previous hole"><ChevronLeft aria-hidden="true" /></button><div><span>Hole</span><strong>{hole.hole}</strong><small>Par {hole.par} · {holeDistances[holeIndex]} ft</small></div><button type="button" onClick={() => setHoleIndex((index) => Math.min(active.holes.length - 1, index + 1))} disabled={holeIndex === active.holes.length - 1} aria-label="Next hole"><ChevronRight aria-hidden="true" /></button></div>
          <div className="score-entry"><span>Your score</span><div><button type="button" onClick={() => changeScore(-1)} disabled={active.status === "COMPLETED"} aria-label="Subtract one stroke"><Minus aria-hidden="true" /></button><strong>{hole.score ?? hole.par}</strong><button type="button" onClick={() => changeScore(1)} disabled={active.status === "COMPLETED"} aria-label="Add one stroke"><Plus aria-hidden="true" /></button></div><small>{hole.score == null ? "Not recorded" : scoreLabel((hole.score ?? hole.par) - hole.par)}</small></div>
        </div>
      </div>
      <div className="round-context-grid">
        <label><span><Disc3 aria-hidden="true" /> Disc used</span><select value={detail.discId ?? ""} onChange={(event) => updateDetail({ discId: event.target.value || null })}><option value="">Not recorded</option>{state.discs.filter((disc) => disc.inBag).map((disc) => <option key={disc.id} value={disc.id}>{disc.nickname || disc.mold} · {disc.manufacturer}</option>)}</select></label>
        <label><span>Shot type</span><select value={detail.shotType} onChange={(event) => updateDetail({ shotType: event.target.value })}><option>Backhand</option><option>Forehand</option><option>Overhand</option><option>Roller</option><option>Putt</option></select></label>
        <label><span>Landing result</span><select value={detail.landingResult} onChange={(event) => updateDetail({ landingResult: event.target.value })}><option>Not recorded</option><option>Fairway</option><option>Rough left</option><option>Rough right</option><option>Circle 1</option><option>Circle 2</option><option>Out of bounds</option></select></label>
        <label><span>Penalty strokes</span><select value={detail.penaltyStrokes} onChange={(event) => updateDetail({ penaltyStrokes: Number(event.target.value) })}>{[0, 1, 2, 3].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="hole-notes"><span><NotebookPen aria-hidden="true" /> Hole notes</span><input value={detail.notes} maxLength={160} placeholder="Release, lie, or correction" onChange={(event) => updateDetail({ notes: event.target.value })} /></label>
      </div>
      <div className="round-progress"><div><span>Round</span><strong>{summary.totalStrokes} strokes · {formatRelative(summary.relativeToPar)}</strong></div><div><span>Completed</span><strong>{summary.completedHoles}/{active.holes.length} holes</strong></div><div><span>Card leaderboard</span><strong>1. {state.displayName} · {formatRelative(summary.relativeToPar)}</strong></div></div>
      <div className="hole-strip" aria-label="Hole scores">{active.holes.map((item, index) => <button key={item.hole} type="button" className={index === holeIndex ? "active" : ""} aria-current={index === holeIndex ? "step" : undefined} onClick={() => setHoleIndex(index)}><span>{item.hole}</span><strong>{item.score ?? "–"}</strong></button>)}</div>
      <div className="scorecard-actions"><button className="demo-button secondary" type="button" onClick={() => navigateTo("bag")}><Sparkles aria-hidden="true" />Ask the AI caddie</button><button className="demo-button primary" type="button" disabled={active.status !== "COMPLETED"} onClick={() => update((current) => ({ ...current, activeRoundId: null }))}><Check aria-hidden="true" />Finish &amp; save round</button></div>
      <p className="score-help">Score corrections create a new local revision. The app never silently discards an unsynchronized entry.</p>
    </section>
  );
}

function RoundSummaryCard({ round }: { round: ReturnType<typeof createRound> }) {
  const summary = summarizeRound(round);
  return <div className="mini-summary"><span>Latest result</span><strong>{summary.totalStrokes} · {formatRelative(summary.relativeToPar)}</strong><small>{summary.birdies} birdies · {summary.pars} pars · App-recorded demo</small></div>;
}

function emptyHoleDetail(): DemoHoleDetail { return { discId: null, shotType: "Backhand", landingResult: "Not recorded", penaltyStrokes: 0, notes: "" }; }
function formatRelative(value: number) { return value === 0 ? "E" : value > 0 ? `+${value}` : String(value); }
function scoreLabel(value: number) { return value <= -2 ? "Eagle or better" : value === -1 ? "Birdie" : value === 0 ? "Par" : value === 1 ? "Bogey" : `+${value}`; }
function formatTime(value: string) { const [hourValue, minutes] = value.split(":"); const hour = Number(hourValue); return `${hour > 12 ? hour - 12 : hour || 12}:${minutes} ${hour >= 12 ? "PM" : "AM"}`; }
function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); }
function nextSaturday() { const date = new Date(); const delta = (6 - date.getDay() + 7) % 7 || 7; date.setDate(date.getDate() + delta); return date.toISOString().slice(0, 10); }
function ShieldIcon() { return <span aria-hidden="true">✓</span>; }
