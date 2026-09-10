"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Camera, Crosshair, ExternalLink, LocateFixed, ShieldCheck, Square, Trash2, Upload, Video } from "lucide-react";
import { coachingObservation, coachingSources, throwGuides, type CameraAngle, type ThrowType } from "@/modules/media-analysis/coaching-knowledge";
import type { CoachingUpload } from "@/modules/media-analysis/coaching-repository";
import { summarizePose, type PoseSummary } from "@/modules/media-analysis/pose-analysis";
import { readPracticeHandoff, type PracticeHandoff } from "@/modules/fieldwork/coaching-handoff";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Props = { initialUploads: CoachingUpload[]; practiceRequested?:boolean; historyError?:boolean };
type Position = { latitude: number; longitude: number; accuracy: number };

export function CameraCoachWorkspace({ initialUploads,practiceRequested=false,historyError=false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const [throwType, setThrowType] = useState<ThrowType>("BACKHAND");
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>("SIDE");
  const [cameraState, setCameraState] = useState<"idle" | "ready" | "recording" | "recorded">("idle");
  const [clip, setClip] = useState<File | null>(null);
  const [leaveDestination,setLeaveDestination]=useState<string|null>(null);
  const allowLeave=useRef(false);
  const [duration, setDuration] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [uploads, setUploads] = useState(initialUploads);
  const [position, setPosition] = useState<Position | null>(null);
  const [targetLat, setTargetLat] = useState("");
  const [targetLng, setTargetLng] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [result, setResult] = useState("CLEAN");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const poseCanvasRef = useRef<HTMLCanvasElement>(null);
  const [poseState, setPoseState] = useState<"idle" | "loading" | "complete" | "failed">("idle");
  const [poseSummary, setPoseSummary] = useState<PoseSummary | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [practiceHandoff,setPracticeHandoff]=useState<PracticeHandoff|null>(null);const [deleteError,setDeleteError]=useState<string|null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const uploadLock=useRef(false), deleteLock=useRef(false); const uploadController=useRef<AbortController|null>(null);
  const [uploadBusy,setUploadBusy]=useState(false);const [discUsed,setDiscUsed]=useState("");const [practiceDistance,setPracticeDistance]=useState("");
  useEffect(()=>{if(!practiceRequested)return;const timer=window.setTimeout(()=>{try{const summary=readPracticeHandoff(sessionStorage.getItem("flightforge.practice.coach"));if(summary){setPracticeHandoff(summary);setDiscUsed(summary.discUsed);setThrowType(summary.throwType);setPracticeDistance(summary.distanceFeet===null?"":String(summary.distanceFeet));setMessage("Fieldwork estimate loaded (GPS uncertainty ±"+Math.round(summary.uncertaintyMeters)+" m). Review it before saving; no calibration or consent was changed.");}}catch{/* Manual entry remains available. */}},0);return()=>window.clearTimeout(timer);},[practiceRequested]);
  const guide = throwGuides[throwType];
  const observation = coachingObservation(throwType, result);

  useEffect(() => () => {uploadController.current?.abort();stopCamera();}, []);
  useEffect(()=>{if(!clip)return;const warn=(event:BeforeUnloadEvent)=>{if(!allowLeave.current){event.preventDefault();event.returnValue="";}};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[clip]);

  useEffect(() => {
    if (!clip && cameraState !== "recording") return;
    const intercept = (event: MouseEvent) => {
      if (allowLeave.current || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      event.preventDefault(); event.stopPropagation(); setLeaveDestination(destination.href);
    };
    document.addEventListener("click", intercept, true);
    return () => document.removeEventListener("click", intercept, true);
  }, [clip, cameraState]);

  async function startCamera() {
    if(uploadLock.current)return;
    stopCamera();
    setMessage(null);
    if (!navigator.mediaDevices?.getUserMedia) { setMessage("This browser does not provide secure camera access. Choose a saved video instead."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraState("ready");
    } catch { setMessage("Camera access was not granted. You can still choose a video from this device."); }
  }
  function stopCamera() { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; }
  function startRecording() {
    if(uploadLock.current)return;
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") { setMessage("Recording is unavailable in this browser. Choose a saved video instead."); return; }
    const preferred = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
    recorder.onstop = () => {
      const elapsed = Math.min(90, Math.max(0.1, (Date.now() - startedRef.current) / 1000));
      const mime = recorder.mimeType.split(";")[0] || "video/webm";
      const file = new File(chunksRef.current, `flightforge-${throwType.toLowerCase()}-${Date.now()}.webm`, { type: mime });
      setDuration(elapsed); setClip(file); setPoseSummary(null); setPoseState("idle"); setIdempotencyKey(crypto.randomUUID()); setCameraState("recorded"); stopCamera();
    };
    recorderRef.current = recorder; startedRef.current = Date.now(); recorder.start(250); setCameraState("recording");
    window.setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 20_000);
  }
  function stopRecording() { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); }
  function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    if(uploadLock.current)return;
    const selected = event.target.files?.[0]; if (!selected) return;
    setClip(selected); setDuration(15); setPoseSummary(null); setPoseState("idle"); setIdempotencyKey(crypto.randomUUID()); setCameraState("recorded"); setMessage("Confirm or adjust the estimated duration before uploading.");
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(uploadLock.current)return; if (!clip) { setMessage("Record or choose a video first."); return; }
    const form = new FormData(event.currentTarget); form.set("video", clip); form.set("durationSeconds", String(duration)); form.set("throwType", throwType); form.set("cameraAngle", cameraAngle); form.set("result", result); form.set("poseSummary", poseSummary ? JSON.stringify(poseSummary) : "");
    if(practiceHandoff&&String(practiceHandoff.distanceFeet)===practiceDistance){form.set("measurementSource","FIELDWORK_GPS");form.set("measurementUncertaintyMeters",String(practiceHandoff.uncertaintyMeters));}
    uploadLock.current=true;setUploadBusy(true);uploadController.current=new AbortController();
    setMessage("Saving your private session…");
    try {
    const response = await fetch("/api/coaching", { method: "POST", body: form, signal:uploadController.current.signal });
    const body = await response.json() as { upload?: CoachingUpload; error?: { message: string } };
    if (!response.ok || !body.upload) { setMessage(body.error?.message ?? "The upload could not be saved."); return; }
    try{sessionStorage.removeItem("flightforge.practice.coach");}catch{/* The handoff expires automatically. */}setPracticeHandoff(null);
    setUploads((items) => items.some((item) => item.id === body.upload!.id) ? items : [body.upload!, ...items]); setClip(null); setCameraState("idle"); setIdempotencyKey(crypto.randomUUID()); setMessage("Private session saved. Your practice guide is ready; automated motion analysis was not run on this clip.");
    } catch(error) {setMessage(error instanceof DOMException&&error.name==="AbortError"?"Upload cancelled. Your clip is still selected; retry safely with the same request.":"The connection failed. Your clip and answers are still here. Retry to save this same session.");}
    finally {uploadLock.current=false;setUploadBusy(false);uploadController.current=null;}
  }
  async function analyzePose() {
    if (!clip||uploadLock.current) return;
    setPoseState("loading"); setMessage("Loading the on-device pose model and sampling your clip…");
    try {
      const vision = await import("@mediapipe/tasks-vision");
      const files = await vision.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm");
      const landmarker = await vision.PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task" }, runningMode: "VIDEO", numPoses: 1, minPoseDetectionConfidence: .55, minTrackingConfidence: .55 });
      const video = document.createElement("video"); video.muted = true; video.playsInline = true; video.preload = "auto";
      const objectUrl = URL.createObjectURL(clip); video.src = objectUrl; await eventOnce(video, "loadedmetadata");
      const usableDuration = Number.isFinite(video.duration) ? Math.min(video.duration, 90) : duration;
      const frames: Array<ReturnType<typeof landmarker.detectForVideo>["landmarks"][number]> = [];
      let representative: ReturnType<typeof landmarker.detectForVideo> | null = null;
      for (let index = 0; index < 12; index++) {
        video.currentTime = Math.max(0, usableDuration * ((index + 1) / 13)); await eventOnce(video, "seeked");
        const detected = landmarker.detectForVideo(video, video.currentTime * 1000);
        if (detected.landmarks[0]) { frames.push(detected.landmarks[0]); if (!representative || index >= 6) representative = detected; }
      }
      const summary = summarizePose(frames, 12); setPoseSummary(summary);
      const canvas = poseCanvasRef.current;
      if (canvas && representative?.landmarks[0]) { const maxWidth = 720, scale = Math.min(1, maxWidth / video.videoWidth); canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale); const ctx = canvas.getContext("2d"); if (ctx) { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); const drawing = new vision.DrawingUtils(ctx); drawing.drawConnectors(representative.landmarks[0], vision.PoseLandmarker.POSE_CONNECTIONS, { color: "#d7ff42", lineWidth: 3 }); drawing.drawLandmarks(representative.landmarks[0], { color: "#ff7a1a", radius: 3 }); } }
      landmarker.close(); URL.revokeObjectURL(objectUrl); setPoseState("complete"); setMessage("Pose landmarks were extracted on this device. The measurements below are approximate observations, not a medical or biomechanical diagnosis.");
    } catch { setPoseState("failed"); setMessage("Pose extraction could not run on this device or network. Your clip was not uploaded by this attempt."); }
  }
  async function remove(id: string) {
    if(deleteLock.current)return;deleteLock.current=true;setDeleteBusy(true);setDeleteError(null);
    try {const response=await fetch(`/api/coaching/${encodeURIComponent(id)}`,{method:"DELETE"});
      if(response.ok){setUploads(items=>items.filter(item=>item.id!==id));setPendingDeleteId(null);setMessage("Private session deleted.");}
      else setDeleteError("Deletion could not be confirmed. Your session remains visible; retry.");
    }catch{setDeleteError("Connection lost during deletion. Retry to confirm removal.");}
    finally{deleteLock.current=false;setDeleteBusy(false);}
  }
  function locate() {
    setLocationError(null);
    navigator.geolocation?.getCurrentPosition((value) => setPosition({ latitude: value.coords.latitude, longitude: value.coords.longitude, accuracy: value.coords.accuracy }), () => setLocationError("Location was unavailable. Check browser permission and sky visibility."), { enableHighAccuracy: true, timeout: 12_000, maximumAge: 5_000 });
  }
  const target = parseTarget(targetLat, targetLng);
  const range = position && target ? rangeTo(position, target) : null;

  return <>
    <section className="coach-hero"><div><span className="eyebrow">Camera coach</span><h1>Camera coach</h1><p>Guided recording, research-informed practice, and useful distance tools designed for the course.</p></div><div className="coach-trust"><ShieldCheck/><strong>Private by default</strong><span>Uploads expire automatically and are not used for AI training without permission.</span></div></section>
    <div className="coach-grid">
      <section className="coach-capture panel"><div className="panel-title"><div><span>01 / CAPTURE</span><h2>{guide.title}</h2></div><Camera/></div>
        <div className="capture-settings"><label>Throw type<select disabled={uploadBusy} value={throwType} onChange={(e) => setThrowType(e.target.value as ThrowType)}><option value="BACKHAND">Backhand</option><option value="FOREHAND">Forehand</option><option value="PUTTING">Putting</option><option value="STANDSTILL">Standstill</option></select></label><label>Camera angle<select disabled={uploadBusy} value={cameraAngle} onChange={(e) => setCameraAngle(e.target.value as CameraAngle)}><option value="SIDE">Side</option><option value="REAR">Rear</option><option value="FRONT">Front</option></select></label></div>
        <p className="capture-instruction">{guide.framing}</p>
        <div className="camera-stage"><video ref={videoRef} muted playsInline/><div className="framing-guide" aria-hidden="true"><span>Keep full body inside frame</span></div>{cameraState === "idle" || cameraState === "recorded" ? <button type="button" disabled={uploadBusy} onClick={startCamera}><Video/> Open camera</button> : cameraState === "ready" ? <button type="button" disabled={uploadBusy} onClick={startRecording}><span className="record-dot"/> Record throw</button> : <button type="button" onClick={stopRecording}><Square/> Stop recording</button>}</div>
        <label className="file-choice"><Upload/> Choose an existing MP4, MOV, or WebM video<input disabled={uploadBusy || poseState==="loading"} type="file" accept="video/mp4,video/quicktime,video/webm" onChange={chooseFile}/></label>
        {clip ? <section className="pose-lab"><div><span>ON-DEVICE VISION</span><h3>Body landmark extraction</h3><p>Samples 12 frames using MediaPipe. Video frames stay on this device during this step.</p></div><button className="button button-secondary" type="button" onClick={analyzePose} disabled={uploadBusy || poseState === "loading"}><Activity/>{poseState === "loading" ? "Analyzing…" : "Analyze body position"}</button><canvas ref={poseCanvasRef} aria-label="Representative video frame with detected body landmarks"/>{poseSummary ? <div className="pose-metrics"><div><strong>{poseSummary.detectedFrames}/{poseSummary.sampledFrames}</strong><span>Frames detected</span></div><div><strong>{Math.round(poseSummary.averageVisibility * 100)}%</strong><span>Landmark visibility</span></div><div><strong>{poseSummary.confidence}</strong><span>Capture confidence</span></div><ul>{poseSummary.observations.map((item) => <li key={item}>{item}</li>)}</ul><p>{poseSummary.limitations.join(" ")}</p></div> : null}</section> : null}
        <form className="coach-form" onSubmit={submit} aria-busy={uploadBusy}><fieldset className="coach-form-fields" disabled={uploadBusy}><input type="hidden" name="idempotencyKey" value={idempotencyKey}/>
          <label>Intended shot<input name="intendedShot" required minLength={2} maxLength={200} placeholder="Flat shot to the center gap"/></label><label>Disc used<input value={discUsed} onChange={e=>setDiscUsed(e.target.value)} name="discUsed" maxLength={100} placeholder="Optional"/></label>
          {practiceHandoff?<p className="wide">Fieldwork GPS estimate: ±{Math.round(practiceHandoff.uncertaintyMeters)} m uncertainty. Review before saving. Editing distance makes it self-reported; bag calibration is unchanged.</p>:null}<label>Approx. distance<input value={practiceDistance} onChange={e=>setPracticeDistance(e.target.value)} name="approximateDistanceFeet" type="number" min="0" max="1500" placeholder="feet"/></label><label>Actual result<select value={result} onChange={(e) => setResult(e.target.value)}><option value="CLEAN">Matched intention</option><option value="EARLY">Missed early</option><option value="LATE">Missed late</option><option value="LOW">Finished low</option><option value="HIGH">Finished high</option><option value="OTHER">Other</option></select></label>
          <label className="wide">What should the coach focus on?<textarea name="analysisQuestion" required minLength={5} maxLength={500} placeholder="Help me make this release more repeatable."/></label>
          <label>Clip duration<input value={duration ? duration.toFixed(1) : ""} onChange={(e) => setDuration(Number(e.target.value))} type="number" min="0.1" max="90" step="0.1" aria-label="Clip duration in seconds"/><small>Seconds; maximum 90</small></label><label>Auto-delete<select name="retainDays" defaultValue="7"><option value="1">After 1 day</option><option value="7">After 7 days</option><option value="30">After 30 days</option></select></label>
          <label className="check wide"><input name="consentToAnalyze" value="true" type="checkbox" required/> I consent to private analysis of this recording. This does not permit model training.</label><label className="check"><input name="userIsMinor" value="true" type="checkbox"/> The player shown is under 18</label><label className="check"><input name="guardianConsent" value="true" type="checkbox"/> A parent or guardian has consented</label>
          <button className="button button-primary wide" disabled={uploadBusy || poseState==="loading" || !clip || !idempotencyKey} type="submit"><Upload/> {uploadBusy?"Saving…":"Save private coaching session"}</button></fieldset>{uploadBusy?<button type="button" className="button button-secondary wide" onClick={()=>uploadController.current?.abort()}>Cancel upload</button>:null}
        </form>{message ? <p className="coach-message" role="status">{message}</p> : null}
      </section>
      <aside className="coach-side">
        <section className="coach-guidance panel"><div className="panel-title"><div><span>02 / PRACTICE</span><h2>Your practice guide</h2></div></div><p>{observation.summary}</p><dl><div><dt>One priority</dt><dd>{observation.priority}</dd></div><div><dt>Then watch</dt><dd>{observation.secondary.join(" · ")}</dd></div><div><dt>Practice drill</dt><dd>{observation.drill}</dd></div><div><dt>Confidence</dt><dd>{observation.confidence}</dd></div></dl><p className="limitation"><strong>What to know:</strong> {observation.limitation}</p></section>
        <section className="rangefinder panel"><div className="panel-title"><div><span>03 / RANGE</span><h2>GPS rangefinder</h2></div><Crosshair/></div><button className="button button-secondary" type="button" onClick={locate}><LocateFixed/> Use my location</button>{position ? <p className="accuracy">Fix accuracy: ±{Math.round(position.accuracy)} m. GPS is an estimate.</p> : null}{locationError ? <p className="form-error">{locationError}</p> : null}<div className="target-grid"><label>Target latitude<input value={targetLat} onChange={(e) => setTargetLat(e.target.value)} inputMode="decimal" placeholder="44.1000"/></label><label>Target longitude<input value={targetLng} onChange={(e) => setTargetLng(e.target.value)} inputMode="decimal" placeholder="-70.2000"/></label></div>{range ? <div className="range-result"><strong>{Math.round(range.feet)} ft</strong><span>{Math.round(range.meters)} m · bearing {Math.round(range.bearing)}°</span></div> : <p className="empty-copy">Use owner-verified basket coordinates for the best result.</p>}{target ? <a className="satellite-link" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/@?api=1&map_action=map&center=${target.latitude},${target.longitude}&zoom=19&basemap=satellite`}>Open satellite view <ExternalLink/></a> : null}<p className="limitation">Satellite imagery is for orientation only. Camera-only distance measurement is not claimed, and this is not emergency navigation.</p></section>
      </aside>
    </div>
    <section className="coach-history"><div className="section-heading"><span className="eyebrow">Private field notebook</span><h2>Saved sessions</h2></div>{historyError&&!uploads.length?<p role="alert">History is temporarily unavailable. Refresh to retry; saved sessions were not removed.</p>:uploads.length ? <div className="session-list">{uploads.map((item) => <article key={item.id}><div><span>{item.throwType} · {item.cameraAngle}</span><strong>{item.fileName}</strong><small>Expires {new Date(item.expiresAt).toLocaleDateString()} · {formatBytes(item.byteSize)}</small></div><p>{item.guidance.priority}</p><button aria-label={`Delete ${item.fileName}`} onClick={() => {setDeleteError(null);setPendingDeleteId(item.id);}}><Trash2/></button></article>)}</div> : <div className="empty-state"><Video/><h3>No saved sessions</h3><p>Record your first throw above. Nothing is uploaded until you submit the consent form.</p></div>}</section>
    <section className="coach-sources"><h2>Training references</h2><p>Practice guidance is linked to published references. It does not scrape coaching videos or diagnose injuries.</p><div>{coachingSources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span>{source.kind}</span><strong>{source.title}</strong><ExternalLink/></a>)}</div></section>
    <ConfirmDialog open={Boolean(leaveDestination)} title="Leave this unsaved recording?" description={uploadBusy ? "An upload is in progress. Leaving cancels this attempt. Check Saved sessions before retrying if the server already received it." : "This recording has not been saved. Stay to save it, or leave and discard this local clip."} confirmLabel="Leave Coach" onCancel={()=>setLeaveDestination(null)} onConfirm={()=>{if(leaveDestination){allowLeave.current=true;uploadController.current?.abort();window.location.assign(leaveDestination);}}}/>
    <ConfirmDialog open={Boolean(pendingDeleteId)} title="Delete this private session?" description="The video and its coaching guidance will be permanently removed." error={deleteError} confirmLabel="Delete session" destructive busy={deleteBusy} onCancel={() => {if(!deleteBusy)setPendingDeleteId(null);}} onConfirm={() => pendingDeleteId ? remove(pendingDeleteId) : undefined} />
  </>;
}

function parseTarget(lat: string, lng: string) { const latitude = Number(lat), longitude = Number(lng); return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 && lat.trim() && lng.trim() ? { latitude, longitude } : null; }
function rangeTo(from: Position, to: { latitude: number; longitude: number }) { const rad = Math.PI / 180, p1 = from.latitude * rad, p2 = to.latitude * rad, dl = (to.longitude - from.longitude) * rad, dp = (to.latitude - from.latitude) * rad; const a = Math.sin(dp/2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) ** 2; const meters = 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); const y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl); return { meters, feet: meters * 3.28084, bearing: (Math.atan2(y,x)/rad + 360) % 360 }; }
function formatBytes(value: number) { return value > 1_048_576 ? `${(value / 1_048_576).toFixed(1)} MB` : `${Math.round(value / 1024)} KB`; }
function eventOnce(target: HTMLMediaElement, event: string) { return new Promise<void>((resolve, reject) => { const timer = window.setTimeout(() => reject(new Error("Media timeout")), 10_000); target.addEventListener(event, () => { window.clearTimeout(timer); resolve(); }, { once: true }); target.addEventListener("error", () => { window.clearTimeout(timer); reject(new Error("Media error")); }, { once: true }); }); }
