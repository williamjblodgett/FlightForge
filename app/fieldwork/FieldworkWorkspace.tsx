"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Crosshair,
  ExternalLink,
  Flag,
  LocateFixed,
  MapPin,
  Navigation,
  RotateCcw,
  Ruler,
  ShieldCheck,
  Target,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  appendMeasurement,
  createThrowMeasurement,
  EMPTY_FIELDWORK_SESSION,
  readFieldworkSession,
  serializeFieldworkSession,
} from "@/modules/fieldwork/measurement";
import { nearestPracticeCandidates } from "@/modules/fieldwork/practice-candidates";
import type {
  CapturedPosition,
  FieldworkSession,
  MeasurementConfidence,
  PracticeCandidate,
  ThrowMeasurement,
} from "@/modules/fieldwork/types";
import styles from "./page.module.css";

const STORAGE_KEY = "flightforge.fieldwork.session.v1";
const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 20_000,
};

type CapturePurpose = "SEARCH" | "START" | "LANDING";
type Notice = { tone: "INFO" | "ERROR" | "SUCCESS"; message: string } | null;

export function FieldworkWorkspace({ candidates }: { candidates: PracticeCandidate[] }) {
  const [session, setSession] = useState<FieldworkSession>(EMPTY_FIELDWORK_SESSION);
  const [tab,setTab]=useState<"measure"|"places">("measure");
  const [discName,setDiscName]=useState(""); const [throwType,setThrowType]=useState<NonNullable<ThrowMeasurement["throwType"]>>("BACKHAND");
  const [sessionTag,setSessionTag]=useState(""); const throwId=useRef<string|null>(null); const [saved,setSaved]=useState(false);const [hasSaved,setHasSaved]=useState(false);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [capturePurpose, setCapturePurpose] = useState<CapturePurpose | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setSession(readFieldworkSession(window.localStorage.getItem(STORAGE_KEY)));
      } catch {
        setStorageAvailable(false);
      } finally {
        setReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready || !storageAvailable) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, serializeFieldworkSession(session));
      } catch {
        setStorageAvailable(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [ready, session, storageAvailable]);

  const publicPropertyCandidates = useMemo(
    () => session.searchPosition
      ? nearestPracticeCandidates(candidates.filter((candidate) => candidate.isPublicProperty), session.searchPosition, 6)
      : [],
    [candidates, session.searchPosition],
  );
  const publicAccessCandidates = useMemo(
    () => session.searchPosition
      ? nearestPracticeCandidates(candidates.filter((candidate) => !candidate.isPublicProperty), session.searchPosition, 4)
      : [],
    [candidates, session.searchPosition],
  );
  const closestDistanceMiles = Math.min(
    publicPropertyCandidates[0]?.distanceMiles ?? Number.POSITIVE_INFINITY,
    publicAccessCandidates[0]?.distanceMiles ?? Number.POSITIVE_INFINITY,
  );

  const activeMeasurement = useMemo(
    () => session.start && session.landing
      ? createThrowMeasurement(session.start, session.landing, "active-measurement")
      : null,
    [session.landing, session.start],
  );

  function captureLocation(purpose: CapturePurpose) {
    if (capturePurpose) return;
    setNotice(null);
    if (!("geolocation" in navigator)) {
      setNotice({ tone: "ERROR", message: "This browser does not provide location access. Try a current mobile browser with Location Services enabled." });
      return;
    }

    setCapturePurpose(purpose);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const captured = browserPosition(position);
        if(purpose!=="SEARCH")setSaved(false);
        setSession((current) => updateSessionWithCapture(current, captured, purpose));
        setCapturePurpose(null);
        setNotice({
          tone: "SUCCESS",
          message: purpose === "SEARCH"
            ? `Location found with a reported accuracy radius of about ${Math.round(captured.accuracyMeters)} meters.`
            : `${purpose === "START" ? "Throwing point" : "Landing point"} marked with a reported accuracy radius of about ${Math.round(captured.accuracyMeters)} meters.`,
        });
      },
      (error) => {
        setCapturePurpose(null);
        setNotice({ tone: "ERROR", message: geolocationErrorMessage(error) });
      },
      GEOLOCATION_OPTIONS,
    );
  }

  function resetActiveThrow() {
    if(capturePurpose)return;
    throwId.current=null;setSaved(false);setHasSaved(false);
    setSession((current) => ({ ...current, start: null, landing: null }));
    setNotice({ tone: "INFO", message: "The active throw was reset. Saved measurements were kept." });
  }

  function clearSession() {
    if(capturePurpose)return;
    throwId.current=null;setSaved(false);setHasSaved(false);
    setSession({ ...EMPTY_FIELDWORK_SESSION });
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      setStorageAvailable(false);
    }
    setShowClearConfirmation(false);
    setNotice({ tone: "SUCCESS", message: "Fieldwork locations and measurements were cleared from this device." });
  }

  function saveThrow() {
    if(!session.start||!session.landing||capturePurpose)return;
    const result={...createThrowMeasurement(session.start,session.landing,throwId.current??undefined),discName,throwType,sessionTag};
    const next=appendMeasurement(session,result);let durable=false;
    try{window.localStorage.setItem(STORAGE_KEY,serializeFieldworkSession(next));durable=true;}catch{setStorageAvailable(false);}
    throwId.current=result.id;setHasSaved(true);setSession(next);setSaved(true);
    setNotice({tone:durable?"SUCCESS":"ERROR",message:durable?"Throw saved on this device. Re-mark and save to correct this same throw.":"Throw kept in memory only. Device storage is unavailable."});
  }
  function sendToCoach(measurement=activeMeasurement) {
    if(!measurement)return;
    try { sessionStorage.setItem("flightforge.practice.coach",JSON.stringify({version:1,expiresAt:Date.now()+30*60*1000,distanceFeet:Math.round(measurement.distanceFeet),discUsed:("discName" in measurement?measurement.discName:discName)??"",throwType:("throwType" in measurement?measurement.throwType:throwType)??"BACKHAND",uncertaintyMeters:measurement.estimatedUncertaintyMeters}));window.location.assign("/coach?practice=1&return_to=%2Ffieldwork"); }
    catch {setNotice({tone:"ERROR",message:"This browser could not transfer the summary. Open Coach and enter the estimated distance manually."});}
  }

  if (!ready) {
    return <div className={`${styles.workspace} page-shell`}><div className={styles.loadingState} role="status"><span className={styles.pulse} /> Restoring this device’s Fieldwork session…</div></div>;
  }

  return (
    <div className={`${styles.workspace} page-shell`}>
      <div className={styles.toolTabs} role="group" aria-label="Fieldwork tools"><button type="button" aria-pressed={tab==="measure"} onClick={()=>setTab("measure")}>Measure a throw</button><button type="button" aria-pressed={tab==="places"} onClick={()=>setTab("places")}>Find space</button></div>
      <div className={styles.commandGrid}>
        <section hidden={tab!=="places"} className={styles.locationPanel} aria-labelledby="nearby-title">
          <div className={styles.panelHeading}>
            <span className={styles.stepNumber}>01</span>
            <div><span>Practice finder</span><h2 id="nearby-title">Places near you</h2></div>
          </div>
          <p className={styles.panelIntro}>FlightForge uses your location only after you press the button. Precise coordinates stay in this browser session—they are not uploaded or saved.</p>
          <button
            className={styles.primaryAction}
            type="button"
            onClick={() => captureLocation("SEARCH")}
            disabled={capturePurpose !== null}
          >
            <LocateFixed aria-hidden="true" />
            {capturePurpose === "SEARCH" ? "Finding your location…" : session.searchPosition ? "Refresh my location" : "Use my location"}
          </button>
          <div className={styles.permissionNote}>
            <ShieldCheck aria-hidden="true" />
            <span><b>You stay in control.</b> Your browser will ask for permission. You can deny it and continue browsing FlightForge.</span>
          </div>
          {session.searchPosition ? (
            <div className={styles.fixReadout}>
              <span>Latest nearby-search fix</span>
              <strong>±{Math.round(session.searchPosition.accuracyMeters)} m reported accuracy</strong>
              <small>{formatCaptureTime(session.searchPosition.capturedAt)}</small>
            </div>
          ) : null}
        </section>

        <section hidden={tab!=="measure"} className={styles.measurePanel} aria-labelledby="measure-title">
          <div className={styles.panelHeading}>
            <span className={styles.stepNumber}>02</span>
            <div><span>Throw tracker</span><h2 id="measure-title">Measure a throw</h2></div>
          </div>

          <p className={styles.panelIntro}>Use a permitted, empty practice area. Never throw toward people or active holes.</p>
          <div className={styles.captureRail}>
            <div className={session.start ? styles.captureComplete : ""}>
              <span className={styles.captureIcon}><Crosshair aria-hidden="true" /></span>
              <div><b>Throwing point</b><small>{session.start ? `Marked ±${Math.round(session.start.accuracyMeters)} m` : "Stand at your lie before marking"}</small></div>
              <button type="button" onClick={() => captureLocation("START")} disabled={capturePurpose !== null}>
                {capturePurpose === "START" ? "Marking…" : session.start ? "Mark again" : "Mark start"}
              </button>
            </div>
            <div className={session.landing ? styles.captureComplete : ""}>
              <span className={styles.captureIcon}><Flag aria-hidden="true" /></span>
              <div><b>Disc landing</b><small>{session.landing ? `Marked ±${Math.round(session.landing.accuracyMeters)} m` : "Walk to the disc, then mark"}</small></div>
              <button type="button" onClick={() => captureLocation("LANDING")} disabled={!session.start || capturePurpose !== null}>
                {capturePurpose === "LANDING" ? "Marking…" : session.landing ? "Mark again" : "Mark landing"}
              </button>
            </div>
          </div>

          {activeMeasurement ? (
            <div className={styles.resultCard} aria-live="polite">
              <div className={styles.resultDistance}>
                <span>Estimated throw</span>
                <strong>{Math.round(activeMeasurement.distanceFeet)}<small> ft</small></strong>
                <b>{activeMeasurement.distanceMeters.toFixed(1)} meters</b>
              </div>
              <ConfidenceReadout confidence={activeMeasurement.confidence} uncertaintyMeters={activeMeasurement.estimatedUncertaintyMeters} />
              <div className={styles.throwTags}>
                <label>Disc (optional)<input value={discName} maxLength={100} onChange={e=>{setDiscName(e.target.value);setSaved(false);}} /></label>
                <label>Throw<select value={throwType} onChange={e=>{setThrowType(e.target.value as NonNullable<ThrowMeasurement["throwType"]>);setSaved(false);}}><option value="BACKHAND">Backhand</option><option value="FOREHAND">Forehand</option><option value="PUTTING">Putting</option><option value="STANDSTILL">Standstill</option></select></label>
                <label>Session (optional)<input value={sessionTag} maxLength={80} placeholder="Evening practice" onChange={e=>{setSessionTag(e.target.value);setSaved(false);}} /></label>
              </div>
              <button type="button" disabled={Boolean(capturePurpose)||saved} onClick={saveThrow}>{saved?"Saved":hasSaved?"Save correction":"Save throw"}</button>
              {saved?<button type="button" onClick={()=>sendToCoach()}>Use estimate in Coach</button>:null}
              <button type="button" disabled={Boolean(capturePurpose)} onClick={resetActiveThrow}><RotateCcw aria-hidden="true" /> Measure another</button>
            </div>
          ) : (
            <div className={styles.emptyResult}>
              <Ruler aria-hidden="true" />
              <p>Two GPS marks create a straight-line estimate. Hills, curves, skips, and the flight path are not included.</p>
            </div>
          )}

          {session.start ? <button className={styles.textAction} type="button" disabled={Boolean(capturePurpose)} onClick={resetActiveThrow}><RotateCcw aria-hidden="true" /> Reset active throw</button> : null}
        </section>
      </div>

      <div className={styles.statusRegion} role="status" aria-live="polite" aria-atomic="true">
        {notice ? <p className={notice.tone === "ERROR" ? styles.statusError : notice.tone === "SUCCESS" ? styles.statusSuccess : styles.statusInfo}>
          {notice.tone === "ERROR" ? <AlertTriangle aria-hidden="true" /> : notice.tone === "SUCCESS" ? <CheckCircle2 aria-hidden="true" /> : <MapPin aria-hidden="true" />}
          {notice.message}
        </p> : null}
        {!storageAvailable ? <p className={styles.statusError}><AlertTriangle aria-hidden="true" />This browser blocked device storage. Measurements will last only until this page closes.</p> : null}
      </div>

      <section hidden={tab!=="places"} className={styles.nearbySection} aria-labelledby="nearby-results-title">
        <div className={styles.sectionHeading}>
          <div><span>Nearest first</span><h2 id="nearby-results-title">Nearby places to check</h2></div>
          {session.searchPosition ? <b>{publicPropertyCandidates.length + publicAccessCandidates.length} leads shown</b> : null}
        </div>
        {session.searchPosition && closestDistanceMiles > 50 && Number.isFinite(closestDistanceMiles) ? (
          <p className={styles.coverageNote}><MapPin aria-hidden="true" /> FlightForge’s reviewed place coverage currently focuses on New England. These are the nearest catalog leads, but they may not be close to you.</p>
        ) : null}
        {!session.searchPosition ? (
          <div className={styles.locationEmpty}>
            <span><Navigation aria-hidden="true" /></span>
            <h3>Share your location when you’re ready.</h3>
            <p>We’ll rank publicly accessible course properties from the FlightForge catalog by straight-line distance. We never call a place a practice field unless its operator confirms that use.</p>
            <button type="button" onClick={() => captureLocation("SEARCH")} disabled={capturePurpose !== null}><LocateFixed aria-hidden="true" /> Find places near me</button>
          </div>
        ) : publicPropertyCandidates.length || publicAccessCandidates.length ? (
          <div className={styles.candidateGroups}>
          {publicPropertyCandidates.length ? <div><div className={styles.groupHeading}><strong>Public properties</strong><span>Municipal, state, or federal course listings—practice space still requires confirmation.</span></div><ol className={styles.candidateList}>
            {publicPropertyCandidates.map((candidate, index) => (
              <li key={candidate.id}>
                <article className={styles.candidateCard}>
                  <div className={styles.candidateRank}>{String(index + 1).padStart(2, "0")}</div>
                  <div className={styles.candidateBody}>
                    <div className={styles.candidateTopline}>
                      <span>{formatCandidateDistance(candidate.distanceMeters, candidate.distanceMiles)} away</span>
                      <b>{candidate.isPublicProperty ? "Public property" : "Public access listed"}</b>
                    </div>
                    <h3>{candidate.name}</h3>
                    <p className={styles.candidateLocation}><MapPin aria-hidden="true" /> {candidate.city}, {candidate.state} · {candidate.holeCount} holes</p>
                    <p className={styles.candidateStatus}>{candidate.statusLabel}</p>
                    <p className={styles.candidateWarning}><AlertTriangle aria-hidden="true" /> Course lead only: {candidate.visitNote}</p>
                    <details>
                      <summary>Access and source details</summary>
                      <p>{candidate.accessLabel} {candidate.locationNote}</p>
                      <a href={candidate.sourceUrl} target="_blank" rel="noreferrer">Check {candidate.sourceName} <ExternalLink aria-hidden="true" /></a>
                    </details>
                  </div>
                  <div className={styles.candidateActions}>
                    <Link href={`/courses/${encodeURIComponent(candidate.slug)}`}>View course <ChevronRight aria-hidden="true" /></Link>
                    <a href={directionsUrl(candidate.latitude, candidate.longitude)} target="_blank" rel="noreferrer"><Navigation aria-hidden="true" /> Directions<span className="sr-only"> to {candidate.name} (opens in a new tab)</span></a>
                  </div>
                </article>
              </li>
            ))}
          </ol></div> : null}
          {publicAccessCandidates.length ? <div><div className={styles.groupHeading}><strong>Other courses open to the public</strong><span>These may be privately owned, paid, or require check-in. Ask before doing fieldwork.</span></div><ol className={styles.candidateList}>
            {publicAccessCandidates.map((candidate, index) => (
              <li key={candidate.id}>
                <article className={styles.candidateCard}>
                  <div className={styles.candidateRank}>{String(index + 1).padStart(2, "0")}</div>
                  <div className={styles.candidateBody}>
                    <div className={styles.candidateTopline}><span>{formatCandidateDistance(candidate.distanceMeters, candidate.distanceMiles)} away</span><b>Public access listed</b></div>
                    <h3>{candidate.name}</h3>
                    <p className={styles.candidateLocation}><MapPin aria-hidden="true" /> {candidate.city}, {candidate.state} · {candidate.holeCount} holes</p>
                    <p className={styles.candidateStatus}>{candidate.statusLabel}</p>
                    <p className={styles.candidateWarning}><AlertTriangle aria-hidden="true" /> Course lead only: {candidate.visitNote}</p>
                    <details><summary>Access and source details</summary><p>{candidate.accessLabel} {candidate.locationNote}</p><a href={candidate.sourceUrl} target="_blank" rel="noreferrer">Check {candidate.sourceName} <ExternalLink aria-hidden="true" /></a></details>
                  </div>
                  <div className={styles.candidateActions}><Link href={`/courses/${encodeURIComponent(candidate.slug)}`}>View course <ChevronRight aria-hidden="true" /></Link><a href={directionsUrl(candidate.latitude, candidate.longitude)} target="_blank" rel="noreferrer"><Navigation aria-hidden="true" /> Directions<span className="sr-only"> to {candidate.name} (opens in a new tab)</span></a></div>
                </article>
              </li>
            ))}
          </ol></div> : null}
          </div>
        ) : (
          <div className={styles.locationEmpty}>
            <span><MapPin aria-hidden="true" /></span>
            <h3>No suitable catalog entries were found nearby.</h3>
            <p>FlightForge only shows course leads with at least nine holes and public access currently listed. A course footprint does not prove that open fieldwork space exists. Try the full directory or ask your recreation department about permitted fields.</p>
            <Link href="/courses">Browse all courses</Link>
          </div>
        )}
      </section>

      <section hidden={tab!=="measure"} className={styles.historySection} aria-labelledby="history-title">
        <div className={styles.sectionHeading}>
          <div><span>On this device</span><h2 id="history-title">Saved throws</h2><p>The most recent 20 summaries stay on this device.</p></div>
          {session.measurements.length ? <button type="button" onClick={() => setShowClearConfirmation(true)}><Trash2 aria-hidden="true" /> Clear session</button> : null}
        </div>
        {showClearConfirmation ? (
          <div className={styles.clearConfirmation} role="group" aria-labelledby="clear-title" aria-describedby="clear-description">
            <div><strong id="clear-title">Clear this Fieldwork history?</strong><p id="clear-description">This permanently removes saved distance summaries from this browser. Precise coordinates are never saved.</p></div>
            <span><button type="button" onClick={() => setShowClearConfirmation(false)}>Keep session</button><button type="button" onClick={clearSession}>Clear from device</button></span>
          </div>
        ) : null}
        {session.measurements.length ? (
          <ol className={styles.historyList}>
            {session.measurements.map((measurement, index) => (
              <li key={measurement.id}>
                <span>{String(session.measurements.length - index).padStart(2, "0")}</span>
                <div><strong>{Math.round(measurement.distanceFeet)} ft</strong><small>{measurement.discName || "Disc not tagged"} · {measurement.throwType?.toLowerCase() || "Throw"}{measurement.sessionTag ? ` · ${measurement.sessionTag}` : ""}</small></div>
                <ConfidencePill confidence={measurement.confidence} />
                <time dateTime={measurement.measuredAt}>{formatCaptureTime(measurement.measuredAt)}</time><button className={styles.textAction} type="button" onClick={()=>sendToCoach(measurement)}>Use in Coach</button>
              </li>
            ))}
          </ol>
        ) : <p className={styles.historyEmpty}><Target aria-hidden="true" /> Your completed throw measurements will appear here and stay on this device until you clear them.</p>}
      </section>

      <aside className={styles.gpsDisclosure}>
        <AlertTriangle aria-hidden="true" />
        <div><strong>Phone GPS provides an estimate, not a rangefinder-grade measurement.</strong><p>Trees, terrain, weather, device hardware, and satellite visibility can move either mark. Displayed uncertainty conservatively adds both reported accuracy radii. Precise coordinates disappear when the browser session ends or you clear the active throw; only distance summaries are saved locally.</p></div>
      </aside>
    </div>
  );
}

function ConfidenceReadout({ confidence, uncertaintyMeters }: { confidence: MeasurementConfidence; uncertaintyMeters: number }) {
  const copy = confidence === "HIGH"
    ? "Both fixes are strong relative to this distance. Still treat the result as an estimate."
    : confidence === "MEDIUM"
      ? "The result is useful for practice tracking, but GPS uncertainty is noticeable."
      : "GPS uncertainty is large relative to this throw. Re-mark both points in a clearer area.";
  return <div className={styles.confidenceReadout}><ConfidencePill confidence={confidence} /><p>{copy} Combined reported uncertainty is about {uncertaintyMeters.toFixed(1)} m.</p></div>;
}

function ConfidencePill({ confidence }: { confidence: MeasurementConfidence }) {
  return <span className={`${styles.confidencePill} ${styles[`confidence${confidence}`]}`}><span aria-hidden="true" /> {confidence.toLowerCase()} confidence</span>;
}

function updateSessionWithCapture(session: FieldworkSession, capture: CapturedPosition, purpose: CapturePurpose): FieldworkSession {
  if (purpose === "SEARCH") return { ...session, searchPosition: capture };
  if (purpose === "START") return { ...session, searchPosition: session.searchPosition ?? capture, start: capture, landing: null };
  if (!session.start) return session;
  return { ...session, searchPosition: session.searchPosition ?? capture, landing: capture };
}

function browserPosition(position: GeolocationPosition): CapturedPosition {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: Math.max(0, position.coords.accuracy),
    capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
  };
}

function geolocationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) return "Location permission was denied. You can enable it for FlightForge in your browser or phone settings and try again.";
  if (error.code === error.POSITION_UNAVAILABLE) return "Your phone could not determine a location. Move to a more open area, turn on Location Services, and try again.";
  if (error.code === error.TIMEOUT) return "The location request timed out before a reliable fix arrived. Move away from heavy cover and try again.";
  return "FlightForge could not capture a location. Check Location Services and try again.";
}

function formatCandidateDistance(distanceMeters: number, distanceMiles: number): string {
  if (distanceMiles < 0.1) return `${Math.max(1, Math.round(distanceMeters))} m`;
  return `${distanceMiles < 10 ? distanceMiles.toFixed(1) : Math.round(distanceMiles)} mi`;
}

function formatCaptureTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function directionsUrl(latitude: number, longitude: number): string {
  const destination = encodeURIComponent(`${latitude},${longitude}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}
