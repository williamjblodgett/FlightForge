"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Backpack, Camera, Check, ChevronLeft, ChevronRight, CircleMinus, CirclePlus, Film, Flag, LoaderCircle, LockKeyhole, Play, ShieldCheck, Sparkles, Upload, X } from "lucide-react";
import type { ActiveRound } from "@/modules/rounds/round-repository";
import type { HoleHighlight } from "./highlight-repository";

type Props = {
  courseId: string; eventId: string; eventTitle: string; courseName: string; holeCount: number;
  isSignedIn: boolean; initialHighlights: HoleHighlight[]; initialRound: ActiveRound | null;
};
type Score = { strokes: number; penalties: number };
type PendingMutation = Score & { holeNumber: number; clientMutationId: string };
type LocalRound = { version: 1; scores: Array<Score | null>; pending: PendingMutation[]; updatedAt: string };

const basePars = [3, 3, 4, 3, 3, 4, 3, 3, 3, 4, 3, 3, 4, 3, 3, 3, 4, 3, 3, 4, 3, 3, 4, 3, 3, 3, 4, 3, 3, 4, 3, 3, 3, 4, 3, 3];

export function HoleHighlightScorecard({ courseId, eventId, eventTitle, courseName, holeCount, isSignedIn, initialHighlights, initialRound }: Props) {
  const pars = useMemo(() => basePars.slice(0, holeCount), [holeCount]);
  const storageKey = `flightforge:round:v1:${eventId}`;
  const seeded = useMemo(() => scoresFromRound(initialRound, holeCount), [initialRound, holeCount]);
  const [scores, setScores] = useState<Array<Score | null>>(seeded);
  const [pending, setPending] = useState<PendingMutation[]>([]);
  const [currentHole, setCurrentHole] = useState(1);
  const [highlights, setHighlights] = useState(initialHighlights);
  const [uploadHole, setUploadHole] = useState<number | null>(null);
  const [watching, setWatching] = useState<HoleHighlight | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<HoleHighlight | null>(null);
  const [message, setMessage] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [online, setOnline] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState(initialRound?.lastSyncedAt ?? null);
  const fileRef = useRef<HTMLInputElement>(null);
  const highlightsByHole = useMemo(() => {
    const grouped = new Map<number, HoleHighlight[]>();
    for (const highlight of highlights) grouped.set(highlight.holeNumber, [...(grouped.get(highlight.holeNumber) ?? []), highlight]);
    return grouped;
  }, [highlights]);
  const score = scores[currentHole - 1];
  const par = pars[currentHole - 1] ?? 3;
  const relative = scores.reduce<number>((total, value, index) => total + (value == null ? 0 : value.strokes + value.penalties - pars[index]), 0);

  const persistLocal = useCallback((nextScores: Array<Score | null>, nextPending: PendingMutation[]) => {
    const local: LocalRound = { version: 1, scores: nextScores, pending: nextPending, updatedAt: new Date().toISOString() };
    localStorage.setItem(storageKey, JSON.stringify(local));
  }, [storageKey]);

  const flush = useCallback(async (mutations: PendingMutation[]) => {
    if (!isSignedIn || !navigator.onLine || mutations.length === 0) return;
    const remaining = [...mutations];
    for (const mutation of mutations) {
      try {
        const response = await fetch("/api/rounds/active", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventId, ...mutation }) });
        if (!response.ok) break;
        remaining.shift();
        setLastSyncedAt(new Date().toISOString());
      } catch { break; }
    }
    setPending(remaining);
    setScores((current) => { persistLocal(current, remaining); return current; });
  }, [eventId, isSignedIn, persistLocal]);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      setOnline(navigator.onLine);
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        try {
          const local = JSON.parse(raw) as LocalRound;
          if (local.version === 1 && Array.isArray(local.scores)) {
            const merged = seeded.map((server, index) => local.scores[index] ?? server);
            setScores(merged);
            setPending(Array.isArray(local.pending) ? local.pending : []);
            void flush(Array.isArray(local.pending) ? local.pending : []);
          }
        } catch { localStorage.removeItem(storageKey); }
      }
    }, 0);
    const becameOnline = () => { setOnline(true); setPending((items) => { void flush(items); return items; }); };
    const becameOffline = () => setOnline(false);
    window.addEventListener("online", becameOnline); window.addEventListener("offline", becameOffline);
    return () => { window.clearTimeout(restoreTimer); window.removeEventListener("online", becameOnline); window.removeEventListener("offline", becameOffline); };
  }, [flush, seeded, storageKey]);

  function recordScore(next: Score) {
    const normalized = { strokes: Math.min(99, Math.max(1, next.strokes)), penalties: Math.min(20, Math.max(0, next.penalties)) };
    const mutation = { ...normalized, holeNumber: currentHole, clientMutationId: crypto.randomUUID() };
    const nextScores = scores.map((item, index) => index === currentHole - 1 ? normalized : item);
    const nextPending = [...pending, mutation];
    setScores(nextScores); setPending(nextPending); persistLocal(nextScores, nextPending);
    const label = scoreLabel(normalized.strokes + normalized.penalties, par);
    setAnnouncement(`Hole ${currentHole}: ${normalized.strokes} strokes${normalized.penalties ? ` plus ${normalized.penalties} penalty` : ""}, ${label}.`);
    void flush(nextPending);
  }

  async function uploadHighlight(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = fileRef.current?.files?.[0];
    if (!file || uploadHole == null) { setMessage("Choose or record a video first."); return; }
    setSubmitting(true); setMessage("");
    try {
      const data = new FormData(form);
      data.set("video", file); data.set("courseId", courseId); data.set("eventId", eventId); data.set("holeNumber", String(uploadHole)); data.set("idempotencyKey", crypto.randomUUID());
      for (const name of ["rightsConfirmed", "participantConsentConfirmed", "containsMinor", "guardianConsentConfirmed"]) data.set(name, data.get(name) === "on" ? "true" : "false");
      const response = await fetch("/api/hole-highlights", { method: "POST", body: data });
      const payload = await response.json() as { highlight?: HoleHighlight; error?: { message?: string } };
      if (!response.ok || !payload.highlight) throw new Error(payload.error?.message ?? "The upload could not be saved.");
      setHighlights((existing) => [payload.highlight!, ...existing]); setUploadHole(null);
      setMessage(`Video for hole ${uploadHole} is quarantined for scanning and transcoding. It cannot be viewed or approved until a sanitized copy exists.`);
      form.reset();
    } catch (error) { setMessage(error instanceof Error ? error.message : "The upload could not be saved."); }
    finally { setSubmitting(false); }
  }

  return <div className="live-round-shell">
    <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
    <header className="round-hud">
      <div><span>Hole {currentHole}/{holeCount}</span><strong>{relative === 0 ? "E" : relative > 0 ? `+${relative}` : relative}</strong><small>{online ? pending.length ? `${pending.length} syncing` : "Saved" : `${pending.length} offline`}</small></div>
      <div className="round-hud-title"><b>{eventTitle}</b><span>{courseName}</span></div>
      <div className="round-hud-actions"><Link href="/bag#caddie-chat" aria-label="Open disc bag and caddie"><Backpack aria-hidden="true" /></Link><Link href="/coach" aria-label="Open camera coach"><Sparkles aria-hidden="true" /></Link><button type="button" onClick={() => setUploadHole(currentHole)} aria-label={`Share video from hole ${currentHole}`}><Camera aria-hidden="true" /></button><button type="button" disabled={currentHole === holeCount} onClick={() => setCurrentHole((hole) => Math.min(holeCount, hole + 1))} aria-label="Next hole"><ChevronRight aria-hidden="true" /></button></div>
    </header>

    {message ? <div className="round-message" role="status"><Check aria-hidden="true" />{message}</div> : null}
    <p className="sync-summary">{online ? pending.length ? "Local changes are safe and waiting to synchronize." : `All scores saved${lastSyncedAt ? ` · ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : " on this device"}.` : "Offline: scoring continues on this device. Nothing will be discarded."}</p>

    <section className="current-hole-card compact-hole-card" aria-labelledby="current-hole-title">
      <div className="hole-number-block"><span>Hole</span><strong>{String(currentHole).padStart(2, "0")}</strong><small>Par {par} · 312 ft</small></div>
      <div className="hole-play-panel">
        <div className="hole-title-row"><div><span className="eyebrow">Pine gap · basket long</span><h1 id="current-hole-title">Record the hole.</h1></div></div>
        <div className="score-entry" aria-label={`Score for hole ${currentHole}`}>
          <div className="stroke-control"><span>Strokes</span><button type="button" onClick={() => recordScore({ strokes: (score?.strokes ?? par) - 1, penalties: score?.penalties ?? 0 })} aria-label="Subtract one stroke"><CircleMinus aria-hidden="true" /></button><output aria-live="off">{score?.strokes ?? "—"}</output><button type="button" onClick={() => recordScore({ strokes: (score?.strokes ?? par - 1) + 1, penalties: score?.penalties ?? 0 })} aria-label="Add one stroke"><CirclePlus aria-hidden="true" /></button></div>
          <div className="quick-scores">{[1, Math.max(1, par - 1), par, par + 1, par + 2].filter((value, index, values) => values.indexOf(value) === index).map((value) => <button key={value} type="button" className={score?.strokes === value ? "is-selected" : ""} onClick={() => recordScore({ strokes: value, penalties: score?.penalties ?? 0 })}>{value === 1 ? "Ace" : scoreLabel(value, par)}</button>)}</div>
          <div className="penalty-control"><span>Penalty strokes</span><button type="button" onClick={() => recordScore({ strokes: score?.strokes ?? par, penalties: (score?.penalties ?? 0) - 1 })} aria-label="Subtract one penalty"><CircleMinus aria-hidden="true" /></button><output>{score?.penalties ?? 0}</output><button type="button" onClick={() => recordScore({ strokes: score?.strokes ?? par, penalties: (score?.penalties ?? 0) + 1 })} aria-label="Add one penalty"><CirclePlus aria-hidden="true" /></button></div>
        </div>
        <div className="hole-navigation"><button type="button" disabled={currentHole === 1} onClick={() => setCurrentHole((hole) => hole - 1)}><ChevronLeft aria-hidden="true" />Previous</button><span>{score == null ? "Score not entered" : `${score.strokes + score.penalties} total · ${scoreLabel(score.strokes + score.penalties, par)}`}</span><button type="button" disabled={currentHole === holeCount} onClick={() => setCurrentHole((hole) => hole + 1)}>Next<ChevronRight aria-hidden="true" /></button></div>
      </div>
    </section>

    <section className="scorecard-panel" aria-labelledby="scorecard-title"><div className="panel-title"><div><span className="eyebrow">Persistent round</span><h2 id="scorecard-title">Scorecard & moments</h2></div><span className="moderation-key"><ShieldCheck aria-hidden="true" />Only sanitized videos can be published</span></div><div className="hole-score-grid">{pars.map((holePar, index) => {
      const hole = index + 1; const holeHighlights = highlightsByHole.get(hole) ?? []; const playable = holeHighlights.filter((item) => item.sanitizationStatus === "CLEAN");
      return <article key={hole} className={currentHole === hole ? "is-current" : ""}><button className="score-hole-main" type="button" onClick={() => setCurrentHole(hole)} aria-label={`Go to hole ${hole}`}><span>{hole}</span><small>Par {holePar}</small><strong>{scores[index] ? scores[index]!.strokes + scores[index]!.penalties : "—"}</strong></button><div className="hole-moment-actions">{holeHighlights.length ? <button type="button" className="video-count" onClick={() => setWatching(holeHighlights[0])} aria-label={`${playable.length ? "Watch" : "Review status for"} ${holeHighlights.length} video moments from hole ${hole}`}><Film aria-hidden="true" /><span>{holeHighlights.length}</span>{holeHighlights.some((item) => item.sanitizationStatus !== "CLEAN") ? <i title="Processing securely" /> : null}</button> : null}<button type="button" className="add-moment" onClick={() => setUploadHole(hole)} aria-label={`Add video to hole ${hole}`}><Camera aria-hidden="true" /></button></div></article>;
    })}</div></section>

      <AccessibleDialog open={uploadHole != null} titleId="upload-highlight-title" onClose={() => setUploadHole(null)}><button className="modal-close" type="button" onClick={() => setUploadHole(null)} aria-label="Close video upload"><X aria-hidden="true" /></button><span className="eyebrow"><Upload aria-hidden="true" /> Hole {uploadHole} community moment</span><h2 id="upload-highlight-title">Share the shot everyone will remember.</h2>{!isSignedIn ? <div className="sign-in-gate"><LockKeyhole aria-hidden="true" /><p>Sign in before uploading. You must be registered for this event to share a video.</p><a className="button button-primary" href={`/sign-in?return_to=${encodeURIComponent(`/play?eventId=${eventId}`)}`}>Sign in to upload</a></div> : <form onSubmit={uploadHighlight}><label className="video-drop"><Camera aria-hidden="true" /><strong>Record or choose a clip</strong><span>MP4 or MOV · up to 60 seconds and 25 MB</span><input ref={fileRef} name="video" type="file" accept="video/mp4,video/quicktime,.mp4,.mov" capture="environment" required /></label><label><span>What happened?</span><textarea name="caption" maxLength={280} rows={3} placeholder="Ace on hole one during the final round…" /></label><label><span>Transcript or spoken-word summary</span><textarea name="transcript" maxLength={2000} rows={4} placeholder="Include dialogue, announcements, or meaningful audio for people who cannot hear the clip." /></label><label className="consent-check"><input name="rightsConfirmed" type="checkbox" required /><span>I recorded this video or have permission to share it.</span></label><label className="consent-check"><input name="participantConsentConfirmed" type="checkbox" required /><span>Identifiable participants consent to being shown.</span></label><label className="consent-check"><input name="containsMinor" type="checkbox" /><span>An identifiable minor appears in this video.</span></label><label className="consent-check"><input name="guardianConsentConfirmed" type="checkbox" /><span>A parent or guardian consented if a minor appears.</span></label><p className="upload-safety-note"><ShieldCheck aria-hidden="true" />Videos are checked and prepared for safe playback before publication.</p><button className="button button-primary" type="submit" disabled={submitting}>{submitting ? <LoaderCircle className="spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}{submitting ? "Preparing upload…" : "Submit securely"}</button></form>}</AccessibleDialog>

    <AccessibleDialog open={Boolean(watching)} titleId="watch-highlight-title" onClose={() => setWatching(null)}>{watching ? <><button className="modal-close" type="button" onClick={() => setWatching(null)} aria-label="Close video viewer"><X aria-hidden="true" /></button><span className="eyebrow"><Play aria-hidden="true" /> Hole {watching.holeNumber} moment</span><h2 id="watch-highlight-title">{watching.caption || "Community highlight"}</h2>{watching.sanitizationStatus === "CLEAN" ? <video controls playsInline preload="metadata" src={`/api/hole-highlights/${watching.id}/media`}>Your browser does not support video playback.</video> : <div className="video-processing" role="status"><ShieldCheck aria-hidden="true" /><strong>Secure processing required</strong><p>The quarantined original is never streamed. Playback becomes available only after scanning, transcoding, and metadata removal produce a clean copy.</p></div>}{watching.transcript ? <details className="video-transcript"><summary>Transcript</summary><p>{watching.transcript}</p></details> : <p className="video-transcript-missing">No spoken-word transcript was supplied.</p>}<div className="video-attribution"><Flag aria-hidden="true" /><span>Shared by {watching.uploaderDisplayName} · {watching.durationSeconds}s</span><b>{watching.sanitizationStatus === "CLEAN" && watching.moderationStatus === "APPROVED" ? "Sanitized and reviewed" : "Private while processing"}</b>{watching.ownedByViewer ? <button type="button" onClick={() => setConfirmDelete(watching)}>Delete my video</button> : null}</div></> : null}</AccessibleDialog>

    <AccessibleDialog open={Boolean(confirmDelete)} titleId="delete-highlight-title" onClose={() => setConfirmDelete(null)}><h2 id="delete-highlight-title">Delete this video permanently?</h2><p>This removes both quarantined and sanitized copies and cannot be undone.</p><div className="dialog-actions"><button className="button button-tertiary" onClick={() => setConfirmDelete(null)}>Keep video</button><button className="button button-primary" onClick={async () => { if (!confirmDelete) return; const response = await fetch(`/api/hole-highlights/${confirmDelete.id}`, { method: "DELETE" }); if (response.ok) { setHighlights((items) => items.filter((item) => item.id !== confirmDelete.id)); setWatching(null); setConfirmDelete(null); setMessage("Your video was permanently deleted."); } }}>Delete permanently</button></div></AccessibleDialog>
  </div>;
}

function AccessibleDialog({ open, titleId, onClose, children }: { open: boolean; titleId: string; onClose: () => void; children: React.ReactNode }) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current; dialog?.focus(); document.body.style.overflow = "hidden";
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const first = focusable[0]; const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); document.body.style.overflow = ""; previous?.focus(); };
  }, [onClose, open]);
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} className="highlight-modal viewer" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>{children}</section></div>;
}

function scoresFromRound(round: ActiveRound | null, holeCount: number): Array<Score | null> {
  const scores: Array<Score | null> = Array(holeCount).fill(null);
  for (const item of round?.holeScores ?? []) if (item.holeNumber <= holeCount) scores[item.holeNumber - 1] = { strokes: item.strokes, penalties: item.penalties };
  return scores;
}
function scoreLabel(value: number, par: number): string {
  if (value === 1) return "Ace";
  const relative = value - par;
  if (relative <= -2) return "Eagle"; if (relative === -1) return "Birdie"; if (relative === 0) return "Par";
  if (relative === 1) return "Bogey"; if (relative === 2) return "Double bogey"; return `+${relative}`;
}
