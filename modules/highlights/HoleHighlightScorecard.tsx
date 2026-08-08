"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { Camera, Check, ChevronLeft, ChevronRight, Film, Flag, LoaderCircle, LockKeyhole, Play, ShieldCheck, Upload, X } from "lucide-react";
import type { HoleHighlight } from "./highlight-repository";

type Props = {
  courseId: string;
  eventId: string;
  eventTitle: string;
  courseName: string;
  isSignedIn: boolean;
  initialHighlights: HoleHighlight[];
};

const pars = [3, 3, 4, 3, 3, 4, 3, 3, 3, 4, 3, 3, 4, 3, 3, 3, 4, 3];

export function HoleHighlightScorecard({ courseId, eventId, eventTitle, courseName, isSignedIn, initialHighlights }: Props) {
  const [scores, setScores] = useState<(number | null)[]>(Array(18).fill(null));
  const [currentHole, setCurrentHole] = useState(1);
  const [highlights, setHighlights] = useState(initialHighlights);
  const [uploadHole, setUploadHole] = useState<number | null>(null);
  const [watching, setWatching] = useState<HoleHighlight | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const highlightsByHole = useMemo(() => {
    const grouped = new Map<number, HoleHighlight[]>();
    for (const highlight of highlights) grouped.set(highlight.holeNumber, [...(grouped.get(highlight.holeNumber) ?? []), highlight]);
    return grouped;
  }, [highlights]);
  const score = scores[currentHole - 1];
  const par = pars[currentHole - 1];
  const relative = scores.reduce<number>((total, value, index) => total + (value == null ? 0 : value - pars[index]), 0);

  function setHoleScore(value: number) {
    setScores((existing) => existing.map((item, index) => index === currentHole - 1 ? value : item));
  }

  async function uploadHighlight(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = fileRef.current?.files?.[0];
    if (!file || uploadHole == null) { setMessage("Choose or record a video first."); return; }
    setSubmitting(true); setMessage("");
    try {
      const durationSeconds = await readVideoDuration(file);
      const data = new FormData(form);
      data.set("video", file);
      data.set("courseId", courseId);
      data.set("eventId", eventId);
      data.set("holeNumber", String(uploadHole));
      data.set("durationSeconds", String(durationSeconds));
      data.set("idempotencyKey", crypto.randomUUID());
      for (const name of ["rightsConfirmed", "participantConsentConfirmed", "containsMinor", "guardianConsentConfirmed"]) {
        data.set(name, data.get(name) === "on" ? "true" : "false");
      }
      const response = await fetch("/api/hole-highlights", { method: "POST", body: data });
      const payload = await response.json() as { highlight?: HoleHighlight; error?: { message?: string } };
      if (!response.ok || !payload.highlight) throw new Error(payload.error?.message ?? "The upload could not be saved.");
      setHighlights((existing) => [payload.highlight!, ...existing]);
      setUploadHole(null);
      setMessage(`Video submitted for hole ${uploadHole}. You can watch it now; everyone else sees it after moderation.`);
      form.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The upload could not be saved.");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="live-round-shell">
      <header className="round-command-bar">
        <div><span className="eyebrow"><span className="live-dot" /> Active round · highlight-enabled</span><h1>{eventTitle}</h1><p>{courseName} · Demonstration scorecard</p></div>
        <div className="round-total"><small>Through {Math.max(1, scores.filter((item) => item != null).length)}</small><strong>{relative === 0 ? "E" : relative > 0 ? `+${relative}` : relative}</strong></div>
      </header>

      {message ? <div className="round-message" role="status"><Check aria-hidden="true" />{message}</div> : null}

      <section className="current-hole-card" aria-labelledby="current-hole-title">
        <div className="hole-number-block"><span>Hole</span><strong>{String(currentHole).padStart(2, "0")}</strong><small>Par {par} · 312 ft</small></div>
        <div className="hole-play-panel">
          <div className="hole-title-row">
            <div><span className="eyebrow">Pine gap · basket long</span><h2 id="current-hole-title">Find the center line.</h2></div>
            <button className="highlight-camera" type="button" onClick={() => setUploadHole(currentHole)} aria-label={`Share video from hole ${currentHole}`}><Camera aria-hidden="true" /><span>Share moment</span></button>
          </div>
          <div className="score-stepper" aria-label={`Score for hole ${currentHole}`}>
            {[par - 1, par, par + 1, par + 2].map((value) => <button key={value} type="button" className={score === value ? "is-selected" : ""} onClick={() => setHoleScore(value)}><strong>{value}</strong><span>{value === par - 1 ? "Birdie" : value === par ? "Par" : value === par + 1 ? "Bogey" : "+2"}</span></button>)}
          </div>
          <div className="hole-navigation">
            <button type="button" disabled={currentHole === 1} onClick={() => setCurrentHole((hole) => hole - 1)}><ChevronLeft aria-hidden="true" />Previous</button>
            <span>{score == null ? "Score not entered" : `${score} strokes recorded`}</span>
            <button type="button" disabled={currentHole === 18} onClick={() => setCurrentHole((hole) => hole + 1)}>Next<ChevronRight aria-hidden="true" /></button>
          </div>
        </div>
      </section>

      <section className="scorecard-panel" aria-labelledby="scorecard-title">
        <div className="panel-title"><div><span className="eyebrow">Round one</span><h2 id="scorecard-title">Scorecard & moments</h2></div><span className="moderation-key"><ShieldCheck aria-hidden="true" />Public videos are reviewed</span></div>
        <div className="hole-score-grid">
          {pars.map((holePar, index) => {
            const hole = index + 1;
            const holeHighlights = highlightsByHole.get(hole) ?? [];
            const approvedCount = holeHighlights.filter((item) => item.moderationStatus === "APPROVED").length;
            const pendingCount = holeHighlights.filter((item) => item.moderationStatus === "PENDING").length;
            return <article key={hole} className={currentHole === hole ? "is-current" : ""}>
              <button className="score-hole-main" type="button" onClick={() => setCurrentHole(hole)} aria-label={`Go to hole ${hole}`}><span>{hole}</span><small>Par {holePar}</small><strong>{scores[index] ?? "—"}</strong></button>
              <div className="hole-moment-actions">
                {holeHighlights.length ? <button type="button" className="video-count" onClick={() => setWatching(holeHighlights[0])} aria-label={`Watch ${holeHighlights.length} video ${holeHighlights.length === 1 ? "moment" : "moments"} from hole ${hole}`}><Film aria-hidden="true" /><span>{approvedCount || pendingCount}</span>{pendingCount ? <i title="Pending moderation" /> : null}</button> : null}
                <button type="button" className="add-moment" onClick={() => setUploadHole(hole)} aria-label={`Add video to hole ${hole}`}><Camera aria-hidden="true" /></button>
              </div>
            </article>;
          })}
        </div>
      </section>

      {uploadHole != null ? <div className="modal-backdrop" role="presentation">
        <section className="highlight-modal" role="dialog" aria-modal="true" aria-labelledby="upload-highlight-title">
          <button className="modal-close" type="button" onClick={() => setUploadHole(null)} aria-label="Close video upload"><X aria-hidden="true" /></button>
          <span className="eyebrow"><Upload aria-hidden="true" /> Hole {uploadHole} community moment</span>
          <h2 id="upload-highlight-title">Share the shot everyone will remember.</h2>
          {!isSignedIn ? <div className="sign-in-gate"><LockKeyhole aria-hidden="true" /><p>Sign in before uploading. Approved videos may appear on this event scorecard.</p><a className="button button-primary" href={`/sign-in?returnTo=${encodeURIComponent("/play")}`}>Sign in to upload</a></div> : <form onSubmit={uploadHighlight}>
            <label className="video-drop"><Camera aria-hidden="true" /><strong>Record or choose a clip</strong><span>MP4, MOV, or WebM · up to 60 seconds and 25 MB</span><input ref={fileRef} name="video" type="file" accept="video/mp4,video/quicktime,video/webm" capture="environment" required /></label>
            <label><span>What happened?</span><textarea name="caption" maxLength={280} rows={3} placeholder="Ace on hole one during the final round…" /></label>
            <label className="consent-check"><input name="rightsConfirmed" type="checkbox" required /><span>I recorded this video or have permission to share it.</span></label>
            <label className="consent-check"><input name="participantConsentConfirmed" type="checkbox" required /><span>Identifiable participants consent to being shown.</span></label>
            <label className="consent-check"><input name="containsMinor" type="checkbox" /><span>An identifiable minor appears in this video.</span></label>
            <label className="consent-check"><input name="guardianConsentConfirmed" type="checkbox" /><span>A parent or guardian consented if a minor appears.</span></label>
            <p className="upload-safety-note"><ShieldCheck aria-hidden="true" />Uploads remain private while awaiting moderation. Location metadata is not used. Do not upload unsafe, abusive, or copyrighted material.</p>
            <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? <LoaderCircle className="spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}{submitting ? "Uploading privately…" : "Submit for review"}</button>
          </form>}
        </section>
      </div> : null}

      {watching ? <div className="modal-backdrop" role="presentation">
        <section className="highlight-modal viewer" role="dialog" aria-modal="true" aria-labelledby="watch-highlight-title">
          <button className="modal-close" type="button" onClick={() => setWatching(null)} aria-label="Close video viewer"><X aria-hidden="true" /></button>
          <span className="eyebrow"><Play aria-hidden="true" /> Hole {watching.holeNumber} moment</span>
          <h2 id="watch-highlight-title">{watching.caption || "Community highlight"}</h2>
          <video controls playsInline preload="metadata" src={`/api/hole-highlights/${watching.id}/media`}>Your browser does not support video playback.</video>
          <div className="video-attribution"><Flag aria-hidden="true" /><span>Shared by {watching.uploaderDisplayName} · {watching.durationSeconds}s</span><b>{watching.moderationStatus === "APPROVED" ? "Reviewed" : "Only you can see this while pending"}</b>{watching.ownedByViewer ? <button type="button" onClick={async () => { if (!window.confirm("Delete this video permanently?")) return; const response = await fetch(`/api/hole-highlights/${watching.id}`, { method: "DELETE" }); if (response.ok) { setHighlights((items) => items.filter((item) => item.id !== watching.id)); setWatching(null); setMessage("Your video was permanently deleted."); } }}>Delete my video</button> : null}</div>
        </section>
      </div> : null}
    </div>
  );
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      if (duration > 0 && duration <= 60) resolve(duration);
      else reject(new Error("Videos must be 60 seconds or shorter."));
    };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("The video duration could not be read.")); };
    video.src = url;
  });
}
