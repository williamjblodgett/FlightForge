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
  type OfflineRoundState,
  type PersistenceResult,
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
  holePars?: Array<number | null>;
  roundPath?: string;
  personal?: boolean;
};

type SyncState = "RESTORING" | "SAVED" | "LOCAL" | "PENDING" | "OFFLINE" | "CONFLICT";

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
  holePars,
  roundPath = `/play?eventId=${encodeURIComponent(eventId)}`,
  personal = false,
}: Props) {
  const pars = useMemo(() => Array.from({ length: holeCount }, (_, i) => holePars?.[i] ?? null), [holeCount, holePars]);
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
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const deletingRef = useRef(false);
  const [message, setMessage] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [completedRound, setCompletedRound] = useState<CompletedRound | null>(null);
  const [persistence, setPersistence] = useState<PersistenceResult | null>(null);
  const [guestDraft, setGuestDraft] = useState<OfflineRoundState | null>(null);
  const [importingGuest, setImportingGuest] = useState(false);
  const currentHoleRef = useRef(1);
  const finishMutationRef = useRef<string | undefined>(undefined);
  const conflictRoundRef = useRef<ActiveRound | null>(null);
  const scoresRef = useRef(scores);
  const pendingRef = useRef(pending);
  const roundIdRef = useRef<string | null>(initialRound?.id ?? null);
  const serverVersionRef = useRef(initialRound?.version ?? 1);
  const lastSyncedRef = useRef(lastSyncedAt);
  const conflictHolesRef = useRef<number[]>([]);
  const [draftBlocked,setDraftBlocked]=useState(false);
  const unavailableRef = useRef(false);
  const mismatchedDraftRef = useRef<OfflineRoundState|null>(null);
  const flushingRef = useRef(false);
  const restoredRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const highlightsByHole = useMemo(() => {
    const grouped = new Map<number, HoleHighlight[]>();
    for (const highlight of highlights) grouped.set(highlight.holeNumber, [...(grouped.get(highlight.holeNumber) ?? []), highlight]);
    return grouped;
  }, [highlights]);
  const score = scores[currentHole - 1];
  const knownPar = pars[currentHole - 1];
  const par = knownPar ?? 3;
  const hasPars = pars.every((value) => value !== null);
  const totalStrokes = scores.reduce<number>((total, value) => total + (value ? value.strokes + value.penalties : 0), 0);
  const relative = hasPars ? scores.reduce<number>((total, value, index) => total + (value == null ? 0 : value.strokes + value.penalties - pars[index]!), 0) : 0;
  const displayScore = hasPars ? formatRelative(relative) : `${totalStrokes} strokes`;
  const completedHoles = scores.filter(Boolean).length;

  const persistSnapshot = useCallback((nextScores: Array<OfflineHoleScore | null>, nextPending: PendingScoreMutation[]) => {
    if(mismatchedDraftRef.current)return Promise.resolve("MEMORY_ONLY" as PersistenceResult);
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
      currentHole: currentHoleRef.current,
      finishMutationId: finishMutationRef.current,
    }).then((result) => { setPersistence(result); return result; });
  }, [eventId, offlineOwnerScope]);

  const applyClientState = useCallback((nextScores: Array<OfflineHoleScore | null>, nextPending: PendingScoreMutation[]) => {
    scoresRef.current = nextScores;
    pendingRef.current = nextPending;
    setScores(nextScores);
    setPending(nextPending);
    void persistSnapshot(nextScores, nextPending);
  }, [persistSnapshot]);

  const flush = useCallback(async () => {
    if (!isSignedIn || typeof navigator === "undefined" || !navigator.onLine || unavailableRef.current || flushingRef.current || conflictHolesRef.current.length || pendingRef.current.length === 0) return;
    flushingRef.current = true;
    setSyncState("PENDING");
    let conflictAttempts = 0;
    try {
      if(!roundIdRef.current){setMessage("Reconnect and reload to initialize server synchronization. Your local scores are preserved.");return;}
      while (pendingRef.current.length > 0 && navigator.onLine) {
        const mutation = pendingRef.current[0]!;
        let response: Response;
        try {
          response = await fetch("/api/rounds/active", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ eventId, roundId:roundIdRef.current, ...mutation, expectedVersion: serverVersionRef.current }),
          });
        } catch {
          setSyncState("OFFLINE");
          break;
        }
        const payload = await response.json().catch(() => ({})) as { round?: ActiveRound; error?: { code?: string; message?: string } };
        if(payload.error?.code==="ROUND_UNAVAILABLE"){unavailableRef.current=true;setDraftBlocked(true);setSyncState("CONFLICT");setMessage(payload.error.message??"This round is no longer active. Download your scores before leaving.");break;}
        if (response.status === 409 && payload.round) {
          conflictAttempts += 1;
          roundIdRef.current = payload.round.id;
          serverVersionRef.current = payload.round.version;
          setCorrections(payload.round.corrections);
          conflictRoundRef.current = payload.round;
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
          if (merged.conflictHoles.length || conflictAttempts >= 3) break;
          continue;
        }
        if (!response.ok || !payload.round) {
          setNeedsSignIn(response.status === 401);
          setMessage(response.status === 401 ? "Your session expired. Sign in again; your unsynchronized scores remain on this device." : payload.error?.message ?? "Synchronization is temporarily unavailable. Your local scores are preserved. Retry when ready.");
          setSyncState(navigator.onLine ? "PENDING" : "OFFLINE");
          break;
        }

        conflictAttempts = 0;
        setNeedsSignIn(false); setMessage("");
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
    let cancelled = false;
    void readOfflineRound(eventId, offlineOwnerScope).then((offline) => {
      if (cancelled) return;
      restoredRef.current = true;
      conflictRoundRef.current=initialRound;
      if(offline?.roundId&&initialRound&&offline.roundId!==initialRound.id){
        mismatchedDraftRef.current=offline;unavailableRef.current=true;setDraftBlocked(true);setMessage("A draft from a previous round remains on this device. Download it before continuing; it has not been merged into this new round.");setPersistence("MEMORY_ONLY");return;
      }
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
      currentHoleRef.current = Math.min(holeCount, offline?.currentHole ?? 1);
      setCurrentHole(currentHoleRef.current);
      finishMutationRef.current = offline?.finishMutationId;
      setOnline(navigator.onLine);
      setSyncState(!navigator.onLine ? "OFFLINE" : !isSignedIn ? "LOCAL" : merged.conflictHoles.length ? "CONFLICT" : offline?.pending.length ? "PENDING" : "SAVED");
      void persistSnapshot(merged.scores, offline?.pending ?? []);
      window.setTimeout(() => void flush(), 0);
    });
    if (isSignedIn) void readOfflineRound(eventId, "guest").then((draft) => { if (!cancelled && draft?.scores.some(Boolean)) setGuestDraft(draft); });
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

  useEffect(() => {
    if (!isSignedIn || needsSignIn) return;
    const retry = window.setInterval(() => {
      if (document.visibilityState === "visible" && restoredRef.current) void flush();
    }, 30_000);
    return () => window.clearInterval(retry);
  }, [flush, isSignedIn, needsSignIn]);

  useEffect(() => {
    currentHoleRef.current = currentHole;
    if (restoredRef.current) void persistSnapshot(scoresRef.current, pendingRef.current);
  }, [currentHole, persistSnapshot]);

  useEffect(() => {
    if (persistence !== "MEMORY_ONLY") return;
    const warn = (event: BeforeUnloadEvent) => { if (scoresRef.current.some(Boolean)) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [persistence]);

  useEffect(() => {
    if (!importingGuest || pending.length || syncState !== "SAVED") return;
    void removeOfflineRound(eventId, "guest").then(() => { setImportingGuest(false); setGuestDraft(null); });
  }, [eventId, importingGuest, pending.length, syncState]);

  function importGuest() {
    if (!guestDraft||unavailableRef.current||!restoredRef.current) return;
    if(guestDraft.scores.length!==holeCount){setMessage("This guest card has a different hole count and has not been imported. Its original remains on this device.");return;}
    const now = new Date().toISOString();
    const nextPending = [...pendingRef.current, ...guestDraft.scores.flatMap((value, index) => value && index < holeCount ? [{ ...value, updatedAt: now, holeNumber: index + 1, clientMutationId: crypto.randomUUID() }] : [])];
    const nextScores = [...scoresRef.current];
    for (const item of nextPending) nextScores[item.holeNumber - 1] = item;
    setImportingGuest(true);
    applyClientState(nextScores, nextPending);
    setCurrentHole(Math.min(holeCount, guestDraft.currentHole ?? 1));
    void flush();
  }

  function exportScores() {
    const blob = new Blob([JSON.stringify(mismatchedDraftRef.current ?? { courseId, eventId, courseName, eventTitle, currentHole, pars, scores, pending }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "flightforge-round-backup.json"; anchor.click(); URL.revokeObjectURL(url);
  }

  function resolveConflicts(keepLocal: boolean) {
    const server=conflictRoundRef.current;
    if(!server){setMessage("Reconnect and reload to review the server card. The local draft is preserved.");return;}
    const holes=new Set(conflictHolesRef.current);
    const nextPending=pendingRef.current.filter(item=>!holes.has(item.holeNumber));
    if(keepLocal)for(const holeNumber of holes){const value=scoresRef.current[holeNumber-1];if(value)nextPending.push({...value,holeNumber,clientMutationId:crypto.randomUUID(),updatedAt:new Date().toISOString()});}
    serverVersionRef.current=server.version;roundIdRef.current=server.id;lastSyncedRef.current=server.lastSyncedAt;setLastSyncedAt(server.lastSyncedAt);
    conflictHolesRef.current=[];setConflictHoles([]);
    applyClientState(mergeServerScoresWithPending(server,nextPending,holeCount),nextPending);
    setSyncState(nextPending.length?"PENDING":"SAVED");void flush();
  }

  function recordScore(next: { strokes: number; penalties: number }) {
    if(unavailableRef.current || !restoredRef.current)return;
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
    const label = knownPar === null ? "par not recorded" : scoreLabel(normalized.strokes + normalized.penalties, par);
    setAnnouncement(`Hole ${currentHole}: ${normalized.strokes} strokes${normalized.penalties ? ` plus ${normalized.penalties} penalty strokes` : ""}, ${label}. Check the save status below.`);
    window.setTimeout(() => void flush(), 0);
  }

  async function deleteHighlight() {
    if (!confirmDelete || deletingRef.current) return;
    deletingRef.current = true; setDeleting(true); setDeleteError("");
    try {
      const response = await fetch(`/api/hole-highlights/${confirmDelete.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("The video could not be deleted. Keep this dialog open and try again.");
      setHighlights(items => items.filter(item => item.id !== confirmDelete.id));
      setConfirmDelete(null); setMessage("Your video was permanently deleted.");
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Connection interrupted. Please try again.");
    } finally { deletingRef.current = false; setDeleting(false); }
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
    if(unavailableRef.current || !restoredRef.current)return;
    if (!isSignedIn || !roundIdRef.current || completedHoles !== holeCount || pendingRef.current.length || !navigator.onLine) return;
    setFinishing(true);
    setMessage("");
    const clientMutationId = finishMutationRef.current ?? crypto.randomUUID();
    finishMutationRef.current = clientMutationId;
    await persistSnapshot(scoresRef.current, pendingRef.current);
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
      window.location.assign(`/rounds/${payload.completedRound.id}`);
      setAnnouncement(`Round complete. Final score ${displayScore} after ${holeCount} holes.`);
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
      <div><span><small>Final</small><b>{displayScore}</b></span><span><small>Total strokes</small><b>{completedRound.totalScore}</b></span><span><small>Holes</small><b>{holeCount}</b></span></div>
      <p>Your synchronized scorecard and correction history are preserved. This event is no longer listed as an active round.</p>
      <nav aria-label="Completed round actions"><Link className="button button-primary" href="/play">Back to Play</Link><Link className="button button-tertiary" href="/profile">View profile</Link></nav>
    </section>;
  }

  return <div className="live-round-shell">
    <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
    <header className="round-hud" aria-label="Active round controls">
      <div className="round-hud-score"><span>Hole {currentHole}/{holeCount}</span><strong>{displayScore}</strong><small>{completedHoles} scored</small></div>
      <div className="round-hud-title"><b>{eventTitle}</b><span>{courseName}</span></div>
      <div className="round-hud-actions">
        <Link href="/play" aria-label="Back to Play"><ChevronLeft aria-hidden="true"/></Link>
        <Link href={`/bag?return_to=${encodeURIComponent(roundPath)}&round=${encodeURIComponent(eventId)}&hole=${currentHole}#caddie-chat`} aria-label="Ask the caddie"><Sparkles aria-hidden="true" /></Link>
        <Link className="hud-secondary" href={`/community?context=${personal ? "course" : "event"}&id=${encodeURIComponent(personal ? courseId : eventId)}`} aria-label="Open round community chat"><MessageCircle aria-hidden="true" /></Link>
        <Link href={`/coach?return_to=${encodeURIComponent(roundPath)}&round=${encodeURIComponent(eventId)}&hole=${currentHole}`} aria-label="Open camera coach"><ScanLine aria-hidden="true" /></Link>
        {!personal ? <button type="button" onClick={(event) => {event.currentTarget.focus();setUploadHole(currentHole);}} aria-label={`Share video from hole ${currentHole}`}><Camera aria-hidden="true" /></button> : null}
        <button type="button" disabled={currentHole === holeCount || syncState === "RESTORING"} onClick={() => setCurrentHole((hole) => Math.min(holeCount, hole + 1))} aria-label="Next hole"><ChevronRight aria-hidden="true" /></button>
      </div>
    </header>
    <p className="round-context-line"><strong>{courseName}</strong> · {eventTitle}{eventId === "flightforge-demo-event" ? " · Fictional demo" : ""}</p>

    {draftBlocked?<section className="round-message" role="alert"><strong>Scoring is paused to protect your draft.</strong><p>Download the preserved scores before leaving. No entries will be sent to a different or completed round.</p><button className="button" onClick={exportScores}>Download preserved scores</button><Link className="button" href="/rounds">Review round history</Link>{initialRound?<button className="button" onClick={async()=>{if(!mismatchedDraftRef.current)return;await removeOfflineRound(eventId,offlineOwnerScope);mismatchedDraftRef.current=null;unavailableRef.current=false;setDraftBlocked(false);roundIdRef.current=initialRound.id;serverVersionRef.current=initialRound.version;applyClientState(mergeServerScoresWithPending(initialRound,[],holeCount),[]);setMessage("The current server round is ready.");}}>I saved my backup — use the current round</button>:null}</section>:null}
    {message ? <div className="round-message" role="status"><Check aria-hidden="true" />{message}</div> : null}
    {persistence === "MEMORY_ONLY" ? <div className="round-message" role="alert"><strong>Not saved on this device.</strong> Browser storage is unavailable. Keep this tab open until synced, or download a backup.<button className="button" onClick={exportScores}>Download scores</button><button className="button" onClick={() => void persistSnapshot(scoresRef.current, pendingRef.current)}>Retry device save</button></div> : <SyncSummary state={syncState} online={online} pendingCount={pending.length} lastSyncedAt={lastSyncedAt} conflictHoles={conflictHoles} onReviewConflict={setCurrentHole} />}
    {isSignedIn && pending.length > 0 ? <div className="round-sync-actions">{needsSignIn ? <Link className="button button-primary" href={`/sign-in?return_to=${encodeURIComponent(roundPath)}`}>Sign in to synchronize</Link> : <button className="button" disabled={!online || draftBlocked || conflictHoles.length > 0} onClick={() => void flush()}>Retry synchronization</button>}<button className="button" onClick={exportScores}>Download backup</button></div> : null}
    {guestDraft && !importingGuest ? <section className="round-message"><strong>Import this device’s guest round?</strong><p>{guestDraft.scores.filter(Boolean).length} scored holes. Importing replaces matching holes in this account’s current round. The guest copy stays until synchronization succeeds.</p><button className="button button-primary" disabled={draftBlocked||guestDraft.scores.length!==holeCount} onClick={importGuest}>Import guest scores</button><button className="button" onClick={() => setGuestDraft(null)}>Not now</button></section> : null}
    {conflictHoles.length ? <div className="round-message"><p>Review holes {conflictHoles.join(", ")} before choosing which scores to keep.</p><button className="button" onClick={() => resolveConflicts(true)}>Keep my local corrections</button><button className="button" onClick={() => resolveConflicts(false)}>Use synchronized scores</button><button className="button" onClick={exportScores}>Download local backup</button></div> : null}
    {!hasPars ? <p className="round-data-note">Strokes-only scoring. Hole pars have not been confirmed for this layout.</p> : null}

    <section className="current-hole-card compact-hole-card" aria-labelledby="current-hole-title">
      <div className="hole-number-block"><span>Hole</span><strong>{String(currentHole).padStart(2, "0")}</strong><small>{knownPar === null ? "Par not recorded" : `Par ${par}`} · distance unavailable</small></div>
      <div className="hole-play-panel">
        <div className="hole-title-row"><div><span className="eyebrow">Live score entry</span><h1 id="current-hole-title">Score hole {currentHole}</h1></div></div>
        <fieldset disabled={draftBlocked || syncState === "RESTORING"} className="score-entry" aria-label={`Score for hole ${currentHole}`}>
          <div className="stroke-control"><span>Strokes</span><button type="button" onClick={() => recordScore({ strokes: (score?.strokes ?? par) - 1, penalties: score?.penalties ?? 0 })} aria-label={`Subtract one stroke from hole ${currentHole}`}><CircleMinus aria-hidden="true" /></button><input key={`${currentHole}:${score?.updatedAt ?? "empty"}`} type="number" inputMode="numeric" min={1} max={99} defaultValue={score?.strokes ?? ""} placeholder="—" aria-label={`Strokes for hole ${currentHole}`} onBlur={(event) => { const value = Number(event.currentTarget.value); if (Number.isInteger(value) && value >= 1 && value <= 99) recordScore({ strokes: value, penalties: score?.penalties ?? 0 }); else event.currentTarget.value = score ? String(score.strokes) : ""; }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { event.currentTarget.value = score ? String(score.strokes) : ""; event.currentTarget.blur(); } }} /><button type="button" onClick={() => recordScore({ strokes: (score?.strokes ?? par - 1) + 1, penalties: score?.penalties ?? 0 })} aria-label={`Add one stroke to hole ${currentHole}`}><CirclePlus aria-hidden="true" /></button></div>
          <div className="quick-scores">{(knownPar === null ? [1,2,3,4,5] : [1, Math.max(1, par - 1), par, par + 1, par + 2]).filter((value, index, values) => values.indexOf(value) === index).map((value) => <button key={value} type="button" aria-pressed={score?.strokes === value} className={score?.strokes === value ? "is-selected" : ""} onClick={() => recordScore({ strokes: value, penalties: score?.penalties ?? 0 })}>{value === 1 ? "Ace" : knownPar === null ? `${value} strokes` : scoreLabel(value, par)}</button>)}</div>
          <div className="penalty-control"><span>Penalty strokes</span><button type="button" onClick={() => recordScore({ strokes: score?.strokes ?? par, penalties: (score?.penalties ?? 0) - 1 })} aria-label={`Subtract one penalty from hole ${currentHole}`}><CircleMinus aria-hidden="true" /></button><output aria-label={`${score?.penalties ?? 0} penalty strokes`}>{score?.penalties ?? 0}</output><button type="button" onClick={() => recordScore({ strokes: score?.strokes ?? par, penalties: (score?.penalties ?? 0) + 1 })} aria-label={`Add one penalty to hole ${currentHole}`}><CirclePlus aria-hidden="true" /></button></div>
        </fieldset>
        <div className="hole-navigation"><button type="button" disabled={currentHole === 1 || syncState === "RESTORING"} onClick={() => setCurrentHole((hole) => hole - 1)}><ChevronLeft aria-hidden="true" />Previous</button><span>{score == null ? "Score not entered" : `${score.strokes + score.penalties} total · ${knownPar === null ? "par not recorded" : scoreLabel(score.strokes + score.penalties, par)}`}</span><button type="button" disabled={currentHole === holeCount || syncState === "RESTORING"} onClick={() => setCurrentHole((hole) => hole + 1)}>Next<ChevronRight aria-hidden="true" /></button></div>
      </div>
    </section>

    <section className="scorecard-panel" aria-labelledby="scorecard-title"><div className="panel-title"><div><span className="eyebrow">Offline-ready round</span><h2 id="scorecard-title">Scorecard & moments</h2></div><span className="moderation-key"><ShieldCheck aria-hidden="true" />{personal ? "Private personal round" : "Only prepared videos can be published"}</span></div><div className="hole-score-grid">{pars.map((holePar, index) => {
      const hole = index + 1;
      const holeHighlights = highlightsByHole.get(hole) ?? [];
      const playable = holeHighlights.filter((item) => item.sanitizationStatus === "CLEAN");
      return <article key={hole} className={currentHole === hole ? "is-current" : ""}><button className="score-hole-main" type="button" disabled={syncState === "RESTORING"} aria-current={currentHole === hole ? "step" : undefined} onClick={() => setCurrentHole(hole)} aria-label={`Go to hole ${hole}, ${scores[index] ? `${scores[index]!.strokes + scores[index]!.penalties} total strokes` : "not scored"}`}><span>{hole}</span><small>{holePar === null ? "Par —" : `Par ${holePar}`}</small><strong>{scores[index] ? scores[index]!.strokes + scores[index]!.penalties : "—"}</strong></button><div className="hole-moment-actions">{!personal && holeHighlights.length ? <button type="button" className="video-count" onClick={(event) => {event.currentTarget.focus();setWatching(holeHighlights[0]);}} aria-label={`${playable.length ? "Watch" : "Review status for"} ${holeHighlights.length} video moments from hole ${hole}`}><Film aria-hidden="true" /><span>{holeHighlights.length}</span>{holeHighlights.some((item) => item.sanitizationStatus !== "CLEAN") ? <i title="Processing securely" /> : null}</button> : null}{!personal ? <button type="button" className="add-moment" onClick={(event) => {event.currentTarget.focus();setUploadHole(hole);}} aria-label={`Add video to hole ${hole}`}><Camera aria-hidden="true" /></button> : null}</div></article>;
    })}</div></section>

    <CorrectionHistory corrections={corrections} pars={pars} />

    {completedHoles === holeCount ? <section className="finish-round-panel" aria-labelledby="finish-round-title"><div><span className="eyebrow"><Check aria-hidden="true" /> Scorecard complete</span><h2 id="finish-round-title">Ready to save the result?</h2><p>{pending.length ? "Your final changes are still safe on this device. Finish becomes available as soon as they synchronize." : !online ? "Reconnect before finishing so the completed round is safely recorded." : "Review the card, then finish the round to move it into your history."}</p></div>{isSignedIn ? <button className="button button-primary" type="button" disabled={draftBlocked || pending.length > 0 || conflictHoles.length > 0 || !online || finishing} onClick={() => setConfirmFinish(true)}>{finishing ? <LoaderCircle className="spin" aria-hidden="true" /> : <Check aria-hidden="true" />}{finishing ? "Finishing…" : "Finish round"}</button> : <Link className="button button-primary" href={`/sign-in?return_to=${encodeURIComponent(roundPath)}`}>Sign in to save round</Link>}</section> : null}

    <AccessibleDialog open={uploadHole != null} titleId="upload-highlight-title" onClose={() => setUploadHole(null)}><button className="modal-close" type="button" onClick={() => setUploadHole(null)} aria-label="Close video upload"><X aria-hidden="true" /></button><span className="eyebrow"><Upload aria-hidden="true" /> Hole {uploadHole} community moment</span><h2 id="upload-highlight-title">Share the shot everyone will remember.</h2>{!isSignedIn ? <div className="sign-in-gate"><LockKeyhole aria-hidden="true" /><p>Sign in before uploading. You must be registered for this event to share a video.</p><a className="button button-primary" href={`/sign-in?return_to=${encodeURIComponent(roundPath)}`}>Sign in to upload</a></div> : <form onSubmit={uploadHighlight}><label className="video-drop"><Camera aria-hidden="true" /><strong>Record or choose a clip</strong><span>MP4 or MOV · up to 60 seconds and 25 MB</span><input ref={fileRef} name="video" type="file" accept="video/mp4,video/quicktime,.mp4,.mov" capture="environment" required /></label><label><span>What happened?</span><textarea name="caption" maxLength={280} rows={3} placeholder="Ace on hole one during the final round…" /></label><label><span>Transcript or spoken-word summary</span><textarea name="transcript" maxLength={2000} rows={4} placeholder="Include meaningful spoken audio for people who cannot hear the clip." /></label><label className="consent-check"><input name="rightsConfirmed" type="checkbox" required /><span>I recorded this video or have permission to share it.</span></label><label className="consent-check"><input name="participantConsentConfirmed" type="checkbox" required /><span>Identifiable participants consent to being shown.</span></label><label className="consent-check"><input name="containsMinor" type="checkbox" /><span>An identifiable minor appears in this video.</span></label><label className="consent-check"><input name="guardianConsentConfirmed" type="checkbox" /><span>A parent or guardian consented if a minor appears.</span></label><p className="upload-safety-note"><ShieldCheck aria-hidden="true" />Uploads remain private until an approved scanner and transcoder create a reviewable playback copy.</p><button className="button button-primary" type="submit" disabled={submitting}>{submitting ? <LoaderCircle className="spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}{submitting ? "Preparing upload…" : "Submit securely"}</button></form>}</AccessibleDialog>

    <AccessibleDialog open={Boolean(watching)} titleId="watch-highlight-title" tone="dark" onClose={() => setWatching(null)}>{watching ? <><button className="modal-close" type="button" onClick={() => setWatching(null)} aria-label="Close video viewer"><X aria-hidden="true" /></button><span className="eyebrow"><Play aria-hidden="true" /> Hole {watching.holeNumber} moment</span><h2 id="watch-highlight-title">{watching.caption || "Community highlight"}</h2>{watching.sanitizationStatus === "CLEAN" ? <video controls playsInline preload="metadata" src={`/api/hole-highlights/${watching.id}/media`}>Your browser does not support video playback.</video> : <div className="video-processing" role="status"><ShieldCheck aria-hidden="true" /><strong>Secure processing required</strong><p>The original is never streamed. Playback becomes available only after a clean copy has been created.</p></div>}{watching.transcript ? <details className="video-transcript"><summary>Transcript</summary><p>{watching.transcript}</p></details> : <p className="video-transcript-missing">No spoken-word transcript was supplied.</p>}<div className="video-attribution"><Flag aria-hidden="true" /><span>Shared by {watching.uploaderDisplayName} · {watching.durationSeconds}s</span><b>{watching.sanitizationStatus === "CLEAN" && watching.moderationStatus === "APPROVED" ? "Prepared and reviewed" : "Private while processing"}</b>{watching.ownedByViewer ? <button type="button" onClick={() => { setDeleteError(""); setConfirmDelete(watching); setWatching(null); }}>Delete my video</button> : null}</div></> : null}</AccessibleDialog>

    <AccessibleDialog open={Boolean(confirmDelete)} titleId="delete-highlight-title" onClose={() => { if (!deletingRef.current) setConfirmDelete(null); }}><h2 id="delete-highlight-title">Delete this video permanently?</h2><p>This removes the uploaded and prepared copies and cannot be undone.</p>{deleteError ? <p role="alert">{deleteError}</p> : null}<div className="dialog-actions"><button className="button button-tertiary" disabled={deleting} onClick={() => setConfirmDelete(null)}>Keep video</button><button className="button button-primary" disabled={deleting} onClick={() => void deleteHighlight()}>{deleting ? "Deleting…" : "Delete permanently"}</button></div></AccessibleDialog>

    <AccessibleDialog open={confirmFinish} titleId="finish-round-confirm-title" onClose={() => { if (!finishing) setConfirmFinish(false); }}><span className="eyebrow"><Check aria-hidden="true" /> Final scorecard</span><h2 id="finish-round-confirm-title">Finish this round?</h2><p>You recorded all {holeCount} holes at <strong>{displayScore}</strong>. The round will move to your history, and later corrections will require an audited score edit.</p><div className="dialog-actions"><button className="button button-tertiary" type="button" disabled={finishing} onClick={() => setConfirmFinish(false)}>Review scorecard</button><button className="button button-primary" type="button" disabled={finishing} onClick={() => void finishRound()}>{finishing ? <LoaderCircle className="spin" aria-hidden="true" /> : <Check aria-hidden="true" />}{finishing ? "Finishing…" : "Finish and save"}</button></div></AccessibleDialog>
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

function CorrectionHistory({ corrections, pars }: { corrections: RoundCorrection[]; pars: Array<number | null> }) {
  if (!corrections.length) return null;
  return <details className="round-correction-history"><summary><History aria-hidden="true" /><span>Scoring history</span><small>{corrections.length} {corrections.length === 1 ? "entry" : "entries"}</small></summary><ol>{corrections.map((correction) => {
    const from = correction.fromStrokes == null ? "Not scored" : `${correction.fromStrokes + (correction.fromPenalties ?? 0)} total`;
    const total = correction.toStrokes + correction.toPenalties;
    return <li key={correction.id}><span>Hole {correction.holeNumber}</span><strong>{from} → {total} total ({pars[correction.holeNumber - 1] == null ? "par not recorded" : scoreLabel(total, pars[correction.holeNumber - 1]!)})</strong><time dateTime={correction.createdAt}>{new Date(correction.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time></li>;
  })}</ol></details>;
}

function AccessibleDialog({ open, titleId, tone = "light", onClose, children }: { open: boolean; titleId: string; tone?: "light" | "dark"; onClose: () => void; children: ReactNode }) {
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
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} className={`highlight-modal${tone === "dark" ? " viewer" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>{children}</section></div>;
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
