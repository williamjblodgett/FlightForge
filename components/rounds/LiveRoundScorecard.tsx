"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleMinus,
  CirclePlus,
  Film,
  Flag,
  History,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  Play,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import type { HoleHighlight } from "@/modules/highlights/highlight-repository";
import {
  mergeOfflineWithServer,
  mergeServerScoresWithPending,
  scoresFromActiveRound,
} from "@/modules/rounds/offline-merge";
import {
  readOfflineRound,
  removeOfflineRound,
  writeOfflineRound,
  type OfflineHoleScore,
  type PendingScoreMutation,
} from "@/modules/rounds/offline-store";
import type { ActiveRound, CompletedRound, RoundCorrection } from "@/modules/rounds/round-repository";

type Props = {
  courseId: string;
  eventId: string;
  eventTitle: string;
  courseName: string;
  holeCount: number;
  isSignedIn: boolean;
  offlineOwnerScope: string;
  initialHighlights: HoleHighlight[];
  initialRound: ActiveRound | null;
};

type SyncState = "RESTORING" | "SAVED" | "LOCAL" | "PENDING" | "OFFLINE" | "CONFLICT";

const basePars = [3, 3, 4, 3, 3, 4, 3, 3, 3, 4, 3, 3, 4, 3, 3, 3, 4, 3, 3, 4, 3, 3, 4, 3, 3, 3, 4, 3, 3, 4, 3, 3, 3, 4, 3, 3];

export function LiveRoundScorecard({
  courseId,
  eventId,
  eventTitle,
  courseName,
  holeCount,
  isSignedIn,
  offlineOwnerScope,
  initialHighlights,
  initialRound,
}: Props) {
  const pars = useMemo(() => basePars.slice(0, holeCount), [holeCount]);
  const seeded = useMemo(() => scoresFromActiveRound(initialRound, holeCount), [initialRound, holeCount]);
  const [scores, setScores] = useState<Array<OfflineHoleScore | null>>(seeded);
  const [pending, setPending] = useState<PendingScoreMutation[]>([]);
  const [currentHole, setCurrentHole] = useState(1);
  const [corrections, setCorrections] = useState<RoundCorrection[]>(initialRound?.corrections ?? []);
  const [conflictHoles, setConflictHoles] = useState<number[]>([]);
  const [syncState, setSyncState] = useState<SyncState>("RESTORING");
  const [lastSyncedAt, setLastSyncedAt] = useState(initialRound?.lastSyncedAt ?? null);
  const [online, setOnline] = useState(true);
  const [highlights, setHighlights] = useState(initialHighlights);
  const [uploadHole, setUploadHole] = useState<number | null>(null);
  const [watching, setWatching] = useState<HoleHighlight | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<HoleHighlight | null>(null);
  const [message, setMessage] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [completedRound, setCompletedRound] = useState<CompletedRound | null>(null);
  const scoresRef = useRef(scores);
  const pendingRef = useRef(pending);
  const roundIdRef = useRef<string | null>(initialRound?.id ?? null);
  const serverVersionRef = useRef(initialRound?.version ?? 1);
  const lastSyncedRef = useRef(lastSyncedAt);
  const conflictHolesRef = useRef<number[]>([]);
  const flushingRef = useRef(false);
  const restoredRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const highlightsByHole = useMemo(() => {
    const grouped = new Map<number, HoleHighlight[]>();
    for (const highlight of highlights) grouped.set(highlight.holeNumber, [...(grouped.get(highlight.holeNumber) ?? []), highlight]);
    return grouped;
  }, [highlights]);
  const score = scores[currentHole - 1];
  const par = pars[currentHole - 1] ?? 3;
  const relative = scores.reduce<number>((total, value, index) => total + (value == null ? 0 : value.strokes + value.penalties - pars[index]), 0);
  const completedHoles = scores.filter(Boolean).length;

  const persistSnapshot = useCallback((nextScores: Array<OfflineHoleScore | null>, nextPending: PendingScoreMutation[]) => {
    return writeOfflineRound({
      schemaVersion: 2,
      eventId,
      ownerScope: offlineOwnerScope,
      roundId: roundIdRef.current,
      serverVersion: serverVersionRef.current,
      scores: nextScores,
      pending: nextPending,
      updatedAt: new Date().toISOString(),
      lastSyncedAt: lastSyncedRef.current,
    });
  }, [eventId, offlineOwnerScope]);

  const applyClientState = useCallback((nextScores: Array<OfflineHoleScore | null>, nextPending: PendingScoreMutation[]) => {
    scoresRef.current = nextScores;
    pendingRef.current = nextPending;
    setScores(nextScores);
    setPending(nextPending);
    void persistSnapshot(nextScores, nextPending);
  }, [persistSnapshot]);

  const flush = useCallback(async () => {
    if (!isSignedIn || typeof navigator === "undefined" || !navigator.onLine || flushingRef.current || pendingRef.current.length === 0) return;
    flushingRef.current = true;
    setSyncState("PENDING");
    let conflictAttempts = 0;
    try {
      while (pendingRef.current.length > 0 && navigator.onLine) {
        const mutation = pendingRef.current[0]!;
        let response: Response;
        try {
          response = await fetch("/api/rounds/active", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ eventId, ...mutation, expectedVersion: serverVersionRef.current }),
          });
        } catch {
          setSyncState("OFFLINE");
          break;
        }
        const payload = await response.json().catch(() => ({})) as { round?: ActiveRound; error?: { message?: string } };
        if (response.status === 409 && payload.round) {
          conflictAttempts += 1;
          roundIdRef.current = payload.round.id;
          serverVersionRef.current = payload.round.version;
          setCorrections(payload.round.corrections);
          const merged = mergeOfflineWithServer(payload.round, {
            schemaVersion: 2,
            eventId,
            ownerScope: offlineOwnerScope,
            roundId: roundIdRef.current,
            serverVersion: serverVersionRef.current,
            scores: scoresRef.current,
            pending: pendingRef.current,
            updatedAt: new Date().toISOString(),
            lastSyncedAt: lastSyncedRef.current,
          }, holeCount);
          setConflictHoles((current) => {
            const next = [...new Set([...current, ...merged.conflictHoles])].sort((a, b) => a - b);
            conflictHolesRef.current = next;
            return next;
          });
          applyClientState(merged.scores, pendingRef.current);
          setSyncState("CONFLICT");
          if (conflictAttempts >= 3) break;
          continue;
        }
        if (!response.ok || !payload.round) {
          setSyncState(navigator.onLine ? "PENDING" : "OFFLINE");
          break;
        }

        conflictAttempts = 0;
        const nextPending = pendingRef.current.filter((item) => item.clientMutationId !== mutation.clientMutationId);
        roundIdRef.current = payload.round.id;
        serverVersionRef.current = payload.round.version;
        lastSyncedRef.current = payload.round.lastSyncedAt;
        setLastSyncedAt(payload.round.lastSyncedAt);
        setCorrections(payload.round.corrections);
        const nextScores = mergeServerScoresWithPending(payload.round, nextPending, holeCount);
        applyClientState(nextScores, nextPending);
      }
    } finally {
      flushingRef.current = false;
      if (pendingRef.current.length === 0) setSyncState(conflictHolesRef.current.length ? "CONFLICT" : "SAVED");
    }
  }, [applyClientState, eventId, holeCount, isSignedIn, offlineOwnerScope]);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    let cancelled = false;
    void readOfflineRound(eventId, offlineOwnerScope).then((offline) => {
      if (cancelled) return;
      const merged = mergeOfflineWithServer(initialRound, offline, holeCount);
      roundIdRef.current = initialRound?.id ?? offline?.roundId ?? null;
      serverVersionRef.current = initialRound?.version ?? offline?.serverVersion ?? 1;
      lastSyncedRef.current = initialRound?.lastSyncedAt ?? offline?.lastSyncedAt ?? null;
      scoresRef.current = merged.scores;
      pendingRef.current = offline?.pending ?? [];
      setScores(merged.scores);
      setPending(offline?.pending ?? []);
      conflictHolesRef.current = merged.conflictHoles;
      setConflictHoles(merged.conflictHoles);
      setLastSyncedAt(lastSyncedRef.current);
      setOnline(navigator.onLine);
      setSyncState(!navigator.onLine ? "OFFLINE" : !isSignedIn ? "LOCAL" : merged.conflictHoles.length ? "CONFLICT" : offline?.pending.length ? "PENDING" : "SAVED");
      void persistSnapshot(merged.scores, offline?.pending ?? []);
      window.setTimeout(() => void flush(), 0);
    });
    const becameOnline = () => { setOnline(true); setSyncState(!isSignedIn ? "LOCAL" : pendingRef.current.length ? "PENDING" : "SAVED"); void flush(); };
    const becameOffline = () => { setOnline(false); setSyncState("OFFLINE"); };
    window.addEventListener("online", becameOnline);
    window.addEventListener("offline", becameOffline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", becameOnline);
      window.removeEventListener("offline", becameOffline);
    };
  }, [eventId, flush, holeCount, initialRound, isSignedIn, offlineOwnerScope, persistSnapshot]);

  function recordScore(next: { strokes: number; penalties: number }) {
    const normalized = {
      strokes: Math.min(99, Math.max(1, Math.round(next.strokes))),
      penalties: Math.min(20, Math.max(0, Math.round(next.penalties))),
    };
    if (score?.strokes === normalized.strokes && score.penalties === normalized.penalties) return;
    const updatedAt = new Date().toISOString();
    const mutation: PendingScoreMutation = {
      ...normalized,
      updatedAt,
      holeNumber: currentHole,
      clientMutationId: crypto.randomUUID(),
    };
    const nextScores = scoresRef.current.map((item, index) => index === currentHole - 1 ? { ...normalized, updatedAt } : item);
    const nextPending = [...pendingRef.current, mutation];
    applyClientState(nextScores, nextPending);
    setSyncState(!navigator.onLine ? "OFFLINE" : !isSignedIn ? "LOCAL" : "PENDING");
    const label = scoreLabel(normalized.strokes + normalized.penalties, par);
    setAnnouncement(`Hole ${currentHole}: ${normalized.strokes} strokes${normalized.penalties ? ` plus ${normalized.penalties} penalty ${normalized.penalties === 1 ? "stroke" : "strokes"}` : ""}, ${label}. Saved on this device.`);
    window.setTimeout(() => void flush(), 0);
  }

  async function uploadHighlight(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = fileRef.current?.files?.[0];
    if (!file || uploadHole == null) { setMessage("Choose or record a video first."); return; }
    setSubmitting(true);
    setMessage("");
    try {
      const data = new FormData(form);
      data.set("video", file);
      data.set("courseId", courseId);
      data.set("eventId", eventId);
      data.set("holeNumber", String(uploadHole));
      data.set("idempotencyKey", crypto.randomUUID());
      for (const name of ["rightsConfirmed", "participantConsentConfirmed", "containsMinor", "guardianConsentConfirmed"]) data.set(name, data.get(name) === "on" ? "true" : "false");
      const response = await fetch("/api/hole-highlights", { method: "POST", body: data });
      const payload = await response.json() as { highlight?: HoleHighlight; error?: { message?: string } };
      if (!response.ok || !payload.highlight) throw new Error(payload.error?.message ?? "The upload could not be saved.");
      setHighlights((existing) => [payload.highlight!, ...existing]);
      setUploadHole(null);
      setMessage(`Video for hole ${uploadHole} is being checked and prepared before it can be viewed.`);
      form.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The upload could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  async function finishRound() {
    if (!isSignedIn || !roundIdRef.current || completedHoles !== holeCount || pendingRef.current.length || !navigator.onLine) return;
    setFinishing(true);
    setMessage("");
    const clientMutationId = crypto.randomUUID();
    try {
      const response = await fetch("/api/rounds/active", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventId,
          roundId: roundIdRef.current,
          expectedVersion: serverVersionRef.current,
          clientMutationId,
        }),
      });
      const payload = await response.json().catch(() => ({})) as {
        completedRound?: CompletedRound;
        round?: ActiveRound;
        error?: { message?: string };
      };
      if (response.status === 409 && payload.round) {
        roundIdRef.current = payload.round.id;
        serverVersionRef.current = payload.round.version;
        lastSyncedRef.current = payload.round.lastSyncedAt;
        setLastSyncedAt(payload.round.lastSyncedAt);
        setCorrections(payload.round.corrections);
        applyClientState(mergeServerScoresWithPending(payload.round, pendingRef.current, holeCount), pendingRef.current);
        setSyncState("CONFLICT");
        throw new Error(payload.error?.message ?? "Review the synchronized scores before finishing.");
      }
      if (!response.ok || !payload.completedRound) throw new Error(payload.error?.message ?? "The round could not be finished.");
      await removeOfflineRound(eventId, offlineOwnerScope);
      setConfirmFinish(false);
      setCompletedRound(payload.completedRound);
      setAnnouncement(`Round complete. Final score ${formatRelative(relative)} after ${holeCount} holes.`);
    } catch (error) {
      setConfirmFinish(false);
      setMessage(error instanceof Error ? error.message : "The round remains active. Try again after scores synchronize.");
    } finally {
      setFinishing(false);
    }
  }

  if (completedRound) {
    return <section className="round-complete-card" aria-labelledby="round-complete-title">
      <span className="eyebrow"><Check aria-hidden="true" /> Round saved</span>
      <h1 id="round-complete-title">That round is in the books.</h1>
      <p><strong>{eventTitle}</strong> at {courseName}</p>
      <div><span><small>Final</small><b>{formatRelative(relative)}</b></span><span><small>Total strokes</small><b>{completedRound.totalScore}</b></span><span><small>Holes</small><b>{holeCount}</b></span></div>
      <p>Your synchronized scorecard and correction history are preserved. This event is no longer listed as an active round.</p>
      <nav aria-label="Completed round actions"><Link className="button button-primary" href="/play">Back to Play</Link><Link className="button button-tertiary" href="/profile">View profile</Link></nav>
    </section>;
  }

  return <div className="live-round-shell">
    <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
    <header className="round-hud" aria-label="Active round controls">
      <div className="round-hud-score"><span>Hole {currentHole}/{holeCount}</span><strong>{formatRelative(relative)}</strong><small>{completedHoles} scored</small></div>
      <div className="round-hud-title"><b>{eventTitle}</b><span>{courseName}</span></div>
      <div className="round-hud-actions">
        <Link className="hud-secondary" href="/bag#caddie-chat" aria-label="Ask the caddie"><Sparkles aria-hidden="true" /></Link>
        <Link href={`/community?context=event&id=${encodeURIComponent(eventId)}`} aria-label="Open event community chat"><MessageCircle aria-hidden="true" /></Link>
        <Link href={`/coach?return_to=${encodeURIComponent(`/play?eventId=${eventId}`)}`} aria-label="Open camera coach"><ScanLine aria-hidden="true" /></Link>
        <button type="button" onClick={() => setUploadHole(currentHole)} aria-label={`Share video from hole ${currentHole}`}><Camera aria-hidden="true" /></button>
        <button type="button" disabled={currentHole === holeCount} onClick={() => setCurrentHole((hole) => Math.min(holeCount, hole + 1))} aria-label="Next hole"><ChevronRight aria-hidden="true" /></button>
      </div>
    </header>

    {message ? <div className="round-message" role="status"><Check aria-hidden="true" />{message}</div> : null}
    <SyncSummary state={syncState} online={online} pendingCount={pending.length} lastSyncedAt={lastSyncedAt} conflictHoles={conflictHoles} onReviewConflict={(hole) => { setCurrentHole(hole); conflictHolesRef.current = []; setConflictHoles([]); setSyncState(pending.length ? "PENDING" : "SAVED"); }} />

    <section className="current-hole-card compact-hole-card" aria-labelledby="current-hole-title">
      <div className="hole-number-block"><span>Hole</span><strong>{String(currentHole).padStart(2, "0")}</strong><small>Par {par} · distance varies</small></div>
      <div className="hole-play-panel">
        <div className="hole-title-row"><div><span className="eyebrow">Live score entry</span><h1 id="current-hole-title">Score hole {currentHole}</h1></div></div>
        <div className="score-entry" role="group" aria-label={`Score for hole ${currentHole}`}>
          <div className="stroke-control"><span>Strokes</span><button type="button" onClick={() => recordScore({ strokes: (score?.strokes ?? par) - 1, penalties: score?.penalties ?? 0 })} aria-label={`Subtract one stroke from hole ${currentHole}`}><CircleMinus aria-hidden="true" /></button><input key={`${currentHole}:${score?.updatedAt ?? "empty"}`} type="number" inputMode="numeric" min={1} max={99} defaultValue={score?.strokes ?? ""} placeholder="—" aria-label={`Strokes for hole ${currentHole}`} onBlur={(event) => { const value = Number(event.currentTarget.value); if (Number.isInteger(value) && value >= 1 && value <= 99) recordScore({ strokes: value, penalties: score?.penalties ?? 0 }); else event.currentTarget.value = score ? String(score.strokes) : ""; }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { event.currentTarget.value = score ? String(score.strokes) : ""; event.currentTarget.blur(); } }} /><button type="button" onClick={() => recordScore({ strokes: (score?.strokes ?? par - 1) + 1, penalties: score?.penalties ?? 0 })} aria-label={`Add one stroke to hole ${currentHole}`}><CirclePlus aria-hidden="true" /></button></div>
          <div className="quick-scores">{[1, Math.max(1, par - 1), par, par + 1, par + 2].filter((value, index, values) => values.indexOf(value) === index).map((value) => <button key={value} type="button" aria-pressed={score?.strokes === value} className={score?.strokes === value ? "is-selected" : ""} onClick={() => recordScore({ strokes: value, penalties: score?.penalties ?? 0 })}>{value === 1 ? "Ace" : scoreLabel(value, par)}</button>)}</div>
          <div className="penalty-control"><span>Penalty strokes</span><button type="button" onClick={() => recordScore({ strokes: score?.strokes ?? par, penalties: (score?.penalties ?? 0) - 1 })} aria-label={`Subtract one penalty from hole ${currentHole}`}><CircleMinus aria-hidden="true" /></button><output aria-label={`${score?.penalties ?? 0} penalty strokes`}>{score?.penalties ?? 0}</output><button type="button" onClick={() => recordScore({ strokes: score?.strokes ?? par, penalties: (score?.penalties ?? 0) + 1 })} aria-label={`Add one penalty to hole ${currentHole}`}><CirclePlus aria-hidden="true" /></button></div>
        </div>
        <div className="hole-navigation"><button type="button" disabled={currentHole === 1} onClick={() => setCurrentHole((hole) => hole - 1)}><ChevronLeft aria-hidden="true" />Previous</button><span>{score == null ? "Score not entered" : `${score.strokes + score.penalties} total · ${scoreLabel(score.strokes + score.penalties, par)}`}</span><button type="button" disabled={currentHole === holeCount} onClick={() => setCurrentHole((hole) => hole + 1)}>Next<ChevronRight aria-hidden="true" /></button></div>
      </div>
    </section>

    <section className="scorecard-panel" aria-labelledby="scorecard-title"><div className="panel-title"><div><span className="eyebrow">Offline-ready round</span><h2 id="scorecard-title">Scorecard & moments</h2></div><span className="moderation-key"><ShieldCheck aria-hidden="true" />Only prepared videos can be published</span></div><div className="hole-score-grid">{pars.map((holePar, index) => {
      const hole = index + 1;
      const holeHighlights = highlightsByHole.get(hole) ?? [];
      const playable = holeHighlights.filter((item) => item.sanitizationStatus === "CLEAN");
      return <article key={hole} className={currentHole === hole ? "is-current" : ""}><button className="score-hole-main" type="button" aria-current={currentHole === hole ? "step" : undefined} onClick={() => setCurrentHole(hole)} aria-label={`Go to hole ${hole}, ${scores[index] ? `${scores[index]!.strokes + scores[index]!.penalties} total strokes` : "not scored"}`}><span>{hole}</span><small>Par {holePar}</small><strong>{scores[index] ? scores[index]!.strokes + scores[index]!.penalties : "—"}</strong></button><div className="hole-moment-actions">{holeHighlights.length ? <button type="button" className="video-count" onClick={() => setWatching(holeHighlights[0])} aria-label={`${playable.length ? "Watch" : "Review status for"} ${holeHighlights.length} video moments from hole ${hole}`}><Film aria-hidden="true" /><span>{holeHighlights.length}</span>{holeHighlights.some((item) => item.sanitizationStatus !== "CLEAN") ? <i title="Processing securely" /> : null}</button> : null}<button type="button" className="add-moment" onClick={() => setUploadHole(hole)} aria-label={`Add video to hole ${hole}`}><Camera aria-hidden="true" /></button></div></article>;
    })}</div></section>

    <CorrectionHistory corrections={corrections} pars={pars} />

    {completedHoles === holeCount ? <section className="finish-round-panel" aria-labelledby="finish-round-title"><div><span className="eyebrow"><Check aria-hidden="true" /> Scorecard complete</span><h2 id="finish-round-title">Ready to make it official?</h2><p>{pending.length ? "Your final changes are still safe on this device. Finish becomes available as soon as they synchronize." : !online ? "Reconnect before finishing so the completed round is safely recorded." : "Review the card, then finish the round to move it into your history."}</p></div>{isSignedIn ? <button className="button button-primary" type="button" disabled={pending.length > 0 || !online || finishing} onClick={() => setConfirmFinish(true)}>{finishing ? <LoaderCircle className="spin" aria-hidden="true" /> : <Check aria-hidden="true" />}{finishing ? "Finishing…" : "Finish round"}</button> : <Link className="button button-primary" href={`/sign-in?return_to=${encodeURIComponent(`/play?eventId=${eventId}`)}`}>Sign in to save round</Link>}</section> : null}

    <AccessibleDialog open={uploadHole != null} titleId="upload-highlight-title" onClose={() => setUploadHole(null)}><button className="modal-close" type="button" onClick={() => setUploadHole(null)} aria-label="Close video upload"><X aria-hidden="true" /></button><span className="eyebrow"><Upload aria-hidden="true" /> Hole {uploadHole} community moment</span><h2 id="upload-highlight-title">Share the shot everyone will remember.</h2>{!isSignedIn ? <div className="sign-in-gate"><LockKeyhole aria-hidden="true" /><p>Sign in before uploading. You must be registered for this event to share a video.</p><a className="button button-primary" href={`/sign-in?return_to=${encodeURIComponent(`/play?eventId=${eventId}`)}`}>Sign in to upload</a></div> : <form onSubmit={uploadHighlight}><label className="video-drop"><Camera aria-hidden="true" /><strong>Record or choose a clip</strong><span>MP4 or MOV · up to 60 seconds and 25 MB</span><input ref={fileRef} name="video" type="file" accept="video/mp4,video/quicktime,.mp4,.mov" capture="environment" required /></label><label><span>What happened?</span><textarea name="caption" maxLength={280} rows={3} placeholder="Ace on hole one during the final round…" /></label><label><span>Transcript or spoken-word summary</span><textarea name="transcript" maxLength={2000} rows={4} placeholder="Include meaningful spoken audio for people who cannot hear the clip." /></label><label className="consent-check"><input name="rightsConfirmed" type="checkbox" required /><span>I recorded this video or have permission to share it.</span></label><label className="consent-check"><input name="participantConsentConfirmed" type="checkbox" required /><span>Identifiable participants consent to being shown.</span></label><label className="consent-check"><input name="containsMinor" type="checkbox" /><span>An identifiable minor appears in this video.</span></label><label className="consent-check"><input name="guardianConsentConfirmed" type="checkbox" /><span>A parent or guardian consented if a minor appears.</span></label><p className="upload-safety-note"><ShieldCheck aria-hidden="true" />Uploads remain private until an approved scanner and transcoder create a reviewable playback copy.</p><button className="button button-primary" type="submit" disabled={submitting}>{submitting ? <LoaderCircle className="spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}{submitting ? "Preparing upload…" : "Submit securely"}</button></form>}</AccessibleDialog>

    <AccessibleDialog open={Boolean(watching)} titleId="watch-highlight-title" onClose={() => setWatching(null)}>{watching ? <><button className="modal-close" type="button" onClick={() => setWatching(null)} aria-label="Close video viewer"><X aria-hidden="true" /></button><span className="eyebrow"><Play aria-hidden="true" /> Hole {watching.holeNumber} moment</span><h2 id="watch-highlight-title">{watching.caption || "Community highlight"}</h2>{watching.sanitizationStatus === "CLEAN" ? <video controls playsInline preload="metadata" src={`/api/hole-highlights/${watching.id}/media`}>Your browser does not support video playback.</video> : <div className="video-processing" role="status"><ShieldCheck aria-hidden="true" /><strong>Secure processing required</strong><p>The original is never streamed. Playback becomes available only after a clean copy has been created.</p></div>}{watching.transcript ? <details className="video-transcript"><summary>Transcript</summary><p>{watching.transcript}</p></details> : <p className="video-transcript-missing">No spoken-word transcript was supplied.</p>}<div className="video-attribution"><Flag aria-hidden="true" /><span>Shared by {watching.uploaderDisplayName} · {watching.durationSeconds}s</span><b>{watching.sanitizationStatus === "CLEAN" && watching.moderationStatus === "APPROVED" ? "Prepared and reviewed" : "Private while processing"}</b>{watching.ownedByViewer ? <button type="button" onClick={() => { setConfirmDelete(watching); setWatching(null); }}>Delete my video</button> : null}</div></> : null}</AccessibleDialog>

    <AccessibleDialog open={Boolean(confirmDelete)} titleId="delete-highlight-title" onClose={() => setConfirmDelete(null)}><h2 id="delete-highlight-title">Delete this video permanently?</h2><p>This removes the uploaded and prepared copies and cannot be undone.</p><div className="dialog-actions"><button className="button button-tertiary" onClick={() => setConfirmDelete(null)}>Keep video</button><button className="button button-primary" onClick={async () => { if (!confirmDelete) return; const response = await fetch(`/api/hole-highlights/${confirmDelete.id}`, { method: "DELETE" }); if (response.ok) { setHighlights((items) => items.filter((item) => item.id !== confirmDelete.id)); setWatching(null); setConfirmDelete(null); setMessage("Your video was permanently deleted."); } }}>Delete permanently</button></div></AccessibleDialog>

    <AccessibleDialog open={confirmFinish} titleId="finish-round-confirm-title" onClose={() => { if (!finishing) setConfirmFinish(false); }}><span className="eyebrow"><Check aria-hidden="true" /> Final scorecard</span><h2 id="finish-round-confirm-title">Finish this round?</h2><p>You recorded all {holeCount} holes at <strong>{formatRelative(relative)}</strong>. The round will move to your history, and later corrections will require an audited score edit.</p><div className="dialog-actions"><button className="button button-tertiary" type="button" disabled={finishing} onClick={() => setConfirmFinish(false)}>Review scorecard</button><button className="button button-primary" type="button" disabled={finishing} onClick={() => void finishRound()}>{finishing ? <LoaderCircle className="spin" aria-hidden="true" /> : <Check aria-hidden="true" />}{finishing ? "Finishing…" : "Finish and save"}</button></div></AccessibleDialog>
  </div>;
}

function SyncSummary({ state, online, pendingCount, lastSyncedAt, conflictHoles, onReviewConflict }: {
  state: SyncState;
  online: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  conflictHoles: number[];
  onReviewConflict: (hole: number) => void;
}) {
  const icon = online ? state === "CONFLICT" ? <ShieldAlert aria-hidden="true" /> : <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />;
  let text = "Restoring this round from this device…";
  if (state === "SAVED") text = `All scores saved${lastSyncedAt ? ` · last synced ${formatSyncTime(lastSyncedAt)}` : " on this device"}.`;
  if (state === "LOCAL") text = `${pendingCount ? `${pendingCount} ${pendingCount === 1 ? "change" : "changes"}` : "This round"} saved only on this device. Sign in to synchronize across devices.`;
  if (state === "PENDING") text = `${pendingCount} ${pendingCount === 1 ? "change is" : "changes are"} safe on this device and waiting to sync.`;
  if (state === "OFFLINE") text = `Offline · ${pendingCount} ${pendingCount === 1 ? "change" : "changes"} saved on this device. Scoring can continue.`;
  if (state === "CONFLICT") text = `Another device changed ${conflictHoles.length === 1 ? `hole ${conflictHoles[0]}` : `${conflictHoles.length} holes`}. Your unsynced entries were preserved.`;
  return <div className={`sync-summary sync-${state.toLowerCase()}`} role="status">{icon}<span>{text}</span>{state === "CONFLICT" && conflictHoles[0] ? <button type="button" onClick={() => onReviewConflict(conflictHoles[0]!)}>Review hole {conflictHoles[0]}</button> : null}</div>;
}

function CorrectionHistory({ corrections, pars }: { corrections: RoundCorrection[]; pars: number[] }) {
  if (!corrections.length) return null;
  return <details className="round-correction-history"><summary><History aria-hidden="true" /><span>Scoring history</span><small>{corrections.length} {corrections.length === 1 ? "entry" : "entries"}</small></summary><ol>{corrections.map((correction) => {
    const from = correction.fromStrokes == null ? "Not scored" : `${correction.fromStrokes + (correction.fromPenalties ?? 0)} total`;
    const total = correction.toStrokes + correction.toPenalties;
    return <li key={correction.id}><span>Hole {correction.holeNumber}</span><strong>{from} → {total} total ({scoreLabel(total, pars[correction.holeNumber - 1] ?? 3)})</strong><time dateTime={correction.createdAt}>{new Date(correction.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time></li>;
  })}</ol></details>;
}

function AccessibleDialog({ open, titleId, onClose, children }: { open: boolean; titleId: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    dialog?.focus();
    document.body.style.overflow = "hidden";
    const inerted: HTMLElement[] = [];
    let branch: HTMLElement | null = dialog;
    while (branch?.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling === branch || !(sibling instanceof HTMLElement) || sibling.hasAttribute("inert")) continue;
        sibling.setAttribute("inert", "");
        inerted.push(sibling);
      }
      branch = branch.parentElement;
      if (branch === document.body) break;
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const first = focusable[0]!;
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = "";
      inerted.forEach((element) => element.removeAttribute("inert"));
      previous?.focus();
    };
  }, [open]);
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} className="highlight-modal viewer" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>{children}</section></div>;
}

function scoreLabel(value: number, par: number): string {
  if (value === 1) return "Ace";
  const relative = value - par;
  if (relative <= -2) return "Eagle";
  if (relative === -1) return "Birdie";
  if (relative === 0) return "Par";
  if (relative === 1) return "Bogey";
  if (relative === 2) return "Double bogey";
  return `+${relative}`;
}

function formatRelative(relative: number): string {
  return relative === 0 ? "E" : relative > 0 ? `+${relative}` : String(relative);
}

function formatSyncTime(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "recently" : parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
