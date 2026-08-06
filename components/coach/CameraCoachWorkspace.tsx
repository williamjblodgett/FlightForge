"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Camera, Crosshair, ExternalLink, LocateFixed, ShieldCheck, Square, Trash2, Upload, Video } from "lucide-react";
import { coachingObservation, coachingSources, throwGuides, type CameraAngle, type ThrowType } from "@/modules/media-analysis/coaching-knowledge";
import type { CoachingUpload } from "@/modules/media-analysis/coaching-repository";

type Props = { initialUploads: CoachingUpload[] };
type Position = { latitude: number; longitude: number; accuracy: number };
type PoseSummary = { sampledFrames: number; detectedFrames: number; landmarkCount: number; averageVisibility: number; stanceToShoulderRatio: number | null; shoulderTiltDegrees: number | null; balanceOffsetPercent: number | null; confidence: "HIGH" | "MEDIUM" | "LOW"; observations: string[]; limitations: string[] };

export function CameraCoachWorkspace({ initialUploads }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const [throwType, setThrowType] = useState<ThrowType>("BACKHAND");
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>("SIDE");
  const [cameraState, setCameraState] = useState<"idle" | "ready" | "recording" | "recorded">("idle");
  const [clip, setClip] = useState<File | null>(null);
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
  const guide = throwGuides[throwType];
  const observation = coachingObservation(throwType, result);

  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
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
    const selected = event.target.files?.[0]; if (!selected) return;
    setClip(selected); setDuration(15); setPoseSummary(null); setPoseState("idle"); setIdempotencyKey(crypto.randomUUID()); setCameraState("recorded"); setMessage("Confirm or adjust the estimated duration before uploading.");
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!clip) { setMessage("Record or choose a video first."); return; }
    const form = new FormData(event.currentTarget); form.set("video", clip); form.set("durationSeconds", String(duration)); form.set("throwType", throwType); form.set("cameraAngle", cameraAngle); form.set("result", result); form.set("poseSummary", poseSummary ? JSON.stringify(poseSummary) : "");
    setMessage("Saving your private session…");
    const response = await fetch("/api/coaching", { method: "POST", body: form });
    const body = await response.json() as { upload?: CoachingUpload; error?: { message: string } };
    if (!response.ok || !body.upload) { setMessage(body.error?.message ?? "The upload could not be saved."); return; }
    setUploads((items) => items.some((item) => item.id === body.upload!.id) ? items : [body.upload!, ...items]); setClip(null); setCameraState("idle"); setIdempotencyKey(crypto.randomUUID()); setMessage("Private session saved. The current guidance is evidence-based and did not run computer vision on your clip.");
  }
  async function analyzePose() {
    if (!clip) return;
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
    if (!window.confirm("Permanently delete this private video and its guidance?")) return;
    const response = await fetch(`/api/coaching/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) setUploads((items) => items.filter((item) => item.id !== id)); else setMessage("Deletion failed. Nothing was hidden locally; please retry.");
  }
  function locate() {
    setLocationError(null);
    navigator.geolocation?.getCurrentPosition((value) => setPosition({ latitude: value.coords.latitude, longitude: value.coords.longitude, accuracy: value.coords.accuracy }), () => setLocationError("Location was unavailable. Check browser permission and sky visibility."), { enableHighAccuracy: true, timeout: 12_000, maximumAge: 5_000 });
  }
  const target = parseTarget(targetLat, targetLng);
  const range = position && target ? rangeTo(position, target) : null;

  return <>
    <section className="coach-hero"><div><span className="eyebrow">Camera coach · private beta</span><h1>Film the throw.<br/><em>Keep the claims honest.</em></h1><p>Guided capture, evidence-aware practice, and distance tools designed for the field—not a fake biomechanics lab.</p></div><div className="coach-trust"><ShieldCheck/><strong>Private by default</strong><span>Uploads expire automatically. AI training is not authorized by this consent.</span></div></section>
    <div className="coach-grid">
      <section className="coach-capture panel"><div className="panel-title"><div><span>01 / CAPTURE</span><h2>{guide.title}</h2></div><Camera/></div>
        <div className="capture-settings"><label>Throw type<select value={throwType} onChange={(e) => setThrowType(e.target.value as ThrowType)}><option value="BACKHAND">Backhand</option><option value="FOREHAND">Forehand</option><option value="PUTTING">Putting</option><option value="STANDSTILL">Standstill</option></select></label><label>Camera angle<select value={cameraAngle} onChange={(e) => setCameraAngle(e.target.value as CameraAngle)}><option value="SIDE">Side</option><option value="REAR">Rear</option><option value="FRONT">Front</option></select></label></div>
        <p className="capture-instruction">{guide.framing}</p>
        <div className="camera-stage"><video ref={videoRef} muted playsInline/><div className="framing-guide" aria-hidden="true"><span>Keep full body inside frame</span></div>{cameraState === "idle" || cameraState === "recorded" ? <button type="button" onClick={startCamera}><Video/> Open camera</button> : cameraState === "ready" ? <button type="button" onClick={startRecording}><span className="record-dot"/> Record throw</button> : <button type="button" onClick={stopRecording}><Square/> Stop recording</button>}</div>
        <label className="file-choice"><Upload/> Choose an existing MP4, MOV, or WebM video<input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={chooseFile}/></label>
        {clip ? <section className="pose-lab"><div><span>ON-DEVICE VISION</span><h3>Body landmark extraction</h3><p>Samples 12 frames using MediaPipe. Video frames stay on this device during this step.</p></div><button className="button button-secondary" type="button" onClick={analyzePose} disabled={poseState === "loading"}><Activity/>{poseState === "loading" ? "Analyzing…" : "Analyze body position"}</button><canvas ref={poseCanvasRef} aria-label="Representative video frame with detected body landmarks"/>{poseSummary ? <div className="pose-metrics"><div><strong>{poseSummary.detectedFrames}/{poseSummary.sampledFrames}</strong><span>Frames detected</span></div><div><strong>{Math.round(poseSummary.averageVisibility * 100)}%</strong><span>Landmark visibility</span></div><div><strong>{poseSummary.confidence}</strong><span>Capture confidence</span></div><ul>{poseSummary.observations.map((item) => <li key={item}>{item}</li>)}</ul><p>{poseSummary.limitations.join(" ")}</p></div> : null}</section> : null}
        <form className="coach-form" onSubmit={submit}><input type="hidden" name="idempotencyKey" value={idempotencyKey}/>
          <label>Intended shot<input name="intendedShot" required minLength={2} maxLength={200} placeholder="Flat shot to the center gap"/></label><label>Disc used<input name="discUsed" maxLength={100} placeholder="Optional"/></label>
          <label>Approx. distance<input name="approximateDistanceFeet" type="number" min="0" max="1500" placeholder="feet"/></label><label>Actual result<select value={result} onChange={(e) => setResult(e.target.value)}><option value="CLEAN">Matched intention</option><option value="EARLY">Missed early</option><option value="LATE">Missed late</option><option value="LOW">Finished low</option><option value="HIGH">Finished high</option><option value="OTHER">Other</option></select></label>
          <label className="wide">What should the coach focus on?<textarea name="analysisQuestion" required minLength={5} maxLength={500} placeholder="Help me make this release more repeatable."/></label>
          <label>Clip duration<input value={duration ? duration.toFixed(1) : ""} onChange={(e) => setDuration(Number(e.target.value))} type="number" min="0.1" max="90" step="0.1" aria-label="Clip duration in seconds"/><small>Seconds; maximum 90</small></label><label>Auto-delete<select name="retainDays" defaultValue="7"><option value="1">After 1 day</option><option value="7">After 7 days</option><option value="30">After 30 days</option></select></label>
          <label className="check wide"><input name="consentToAnalyze" value="true" type="checkbox" required/> I consent to private analysis of this recording. This does not permit model training.</label><label className="check"><input name="userIsMinor" value="true" type="checkbox"/> The player shown is under 18</label><label className="check"><input name="guardianConsent" value="true" type="checkbox"/> A parent or guardian has consented</label>
          <button className="button button-primary wide" disabled={!clip || !idempotencyKey} type="submit"><Upload/> Save private coaching session</button>
        </form>{message ? <p className="coach-message" role="status">{message}</p> : null}
      </section>
      <aside className="coach-side">
        <section className="coach-guidance panel"><div className="panel-title"><div><span>02 / PRACTICE</span><h2>Evidence-aware guide</h2></div></div><p>{observation.summary}</p><dl><div><dt>One priority</dt><dd>{observation.priority}</dd></div><div><dt>Then watch</dt><dd>{observation.secondary.join(" · ")}</dd></div><div><dt>Practice drill</dt><dd>{observation.drill}</dd></div><div><dt>Confidence</dt><dd>{observation.confidence}</dd></div></dl><p className="limitation"><strong>Limitation:</strong> {observation.limitation}</p></section>
        <section className="rangefinder panel"><div className="panel-title"><div><span>03 / RANGE</span><h2>GPS rangefinder</h2></div><Crosshair/></div><button className="button button-secondary" type="button" onClick={locate}><LocateFixed/> Use my location</button>{position ? <p className="accuracy">Fix accuracy: ±{Math.round(position.accuracy)} m. GPS is an estimate.</p> : null}{locationError ? <p className="form-error">{locationError}</p> : null}<div className="target-grid"><label>Target latitude<input value={targetLat} onChange={(e) => setTargetLat(e.target.value)} inputMode="decimal" placeholder="44.1000"/></label><label>Target longitude<input value={targetLng} onChange={(e) => setTargetLng(e.target.value)} inputMode="decimal" placeholder="-70.2000"/></label></div>{range ? <div className="range-result"><strong>{Math.round(range.feet)} ft</strong><span>{Math.round(range.meters)} m · bearing {Math.round(range.bearing)}°</span></div> : <p className="empty-copy">Use owner-verified basket coordinates for the best result.</p>}{target ? <a className="satellite-link" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/@?api=1&map_action=map&center=${target.latitude},${target.longitude}&zoom=19&basemap=satellite`}>Open satellite view <ExternalLink/></a> : null}<p className="limitation">Satellite imagery is for orientation only. Camera-only distance measurement is not claimed, and this is not emergency navigation.</p></section>
      </aside>
    </div>
    <section className="coach-history"><div className="section-heading"><span className="eyebrow">Private field notebook</span><h2>Saved sessions</h2></div>{uploads.length ? <div className="session-list">{uploads.map((item) => <article key={item.id}><div><span>{item.throwType} · {item.cameraAngle}</span><strong>{item.fileName}</strong><small>Expires {new Date(item.expiresAt).toLocaleDateString()} · {formatBytes(item.byteSize)}</small></div><p>{item.guidance.priority}</p><button aria-label={`Delete ${item.fileName}`} onClick={() => remove(item.id)}><Trash2/></button></article>)}</div> : <div className="empty-state"><Video/><h3>No saved sessions</h3><p>Record your first throw above. Nothing is uploaded until you submit the consent form.</p></div>}</section>
    <section className="coach-sources"><h2>How the assistant knows what it knows</h2><p>Guidance is versioned by evidence type. It does not scrape coaching videos or diagnose injuries.</p><div>{coachingSources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span>{source.kind}</span><strong>{source.title}</strong><ExternalLink/></a>)}</div></section>
  </>;
}

function parseTarget(lat: string, lng: string) { const latitude = Number(lat), longitude = Number(lng); return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 && lat.trim() && lng.trim() ? { latitude, longitude } : null; }
function rangeTo(from: Position, to: { latitude: number; longitude: number }) { const rad = Math.PI / 180, p1 = from.latitude * rad, p2 = to.latitude * rad, dl = (to.longitude - from.longitude) * rad, dp = (to.latitude - from.latitude) * rad; const a = Math.sin(dp/2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) ** 2; const meters = 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); const y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl); return { meters, feet: meters * 3.28084, bearing: (Math.atan2(y,x)/rad + 360) % 360 }; }
function formatBytes(value: number) { return value > 1_048_576 ? `${(value / 1_048_576).toFixed(1)} MB` : `${Math.round(value / 1024)} KB`; }
function eventOnce(target: HTMLMediaElement, event: string) { return new Promise<void>((resolve, reject) => { const timer = window.setTimeout(() => reject(new Error("Media timeout")), 10_000); target.addEventListener(event, () => { window.clearTimeout(timer); resolve(); }, { once: true }); target.addEventListener("error", () => { window.clearTimeout(timer); reject(new Error("Media error")); }, { once: true }); }); }
function summarizePose(frames: Array<Array<{ x: number; y: number; visibility?: number }>>, sampledFrames: number): PoseSummary { const valid = frames.filter((frame) => frame.length >= 29); const visibility = valid.flatMap((frame) => frame.map((point) => point.visibility ?? 0)); const representative = valid[Math.floor(valid.length / 2)]; let stance: number | null = null, tilt: number | null = null, balance: number | null = null; if (representative) { const shoulderWidth = distance(representative[11], representative[12]); const ankleWidth = distance(representative[27], representative[28]); stance = shoulderWidth > .001 ? ankleWidth / shoulderWidth : null; tilt = Math.atan2(Math.abs(representative[11].y - representative[12].y), Math.abs(representative[11].x - representative[12].x)) * 180 / Math.PI; const hipX = (representative[23].x + representative[24].x) / 2, ankleX = (representative[27].x + representative[28].x) / 2; balance = shoulderWidth > .001 ? Math.abs(hipX - ankleX) / shoulderWidth * 100 : null; } const rate = valid.length / sampledFrames, averageVisibility = visibility.length ? visibility.reduce((a,b) => a+b,0) / visibility.length : 0; const confidence = rate >= .8 && averageVisibility >= .75 ? "HIGH" : rate >= .5 ? "MEDIUM" : "LOW"; const observations = [rate < .75 ? "The full body was not consistently detected; improve lighting, distance, or framing." : "The player was detected consistently enough for broad position observations.", balance != null && balance > 45 ? "The representative frame shows the hip center away from the ankle midpoint; review balance across the full clip before changing form." : "The representative frame does not show a large static balance offset.", tilt != null && tilt > 18 ? "The shoulders appear noticeably tilted in the representative frame; confirm whether that matches the intended release plane." : "No large shoulder tilt was measured in the representative frame."]; return { sampledFrames, detectedFrames: valid.length, landmarkCount: valid[0]?.length ?? 0, averageVisibility, stanceToShoulderRatio: stance, shoulderTiltDegrees: tilt, balanceOffsetPercent: balance, confidence, observations, limitations: ["Single-view pose landmarks do not measure disc nose angle, spin, release speed, or joint forces.", "Loose clothing, occlusion, camera angle, and motion blur can change these estimates."] }; }
function distance(a: {x:number;y:number}, b: {x:number;y:number}) { return Math.hypot(a.x-b.x, a.y-b.y); }
