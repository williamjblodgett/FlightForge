import { useState, type FormEvent } from "react";
import { BookOpen, Camera, Check, ChevronRight, FileVideo, LockKeyhole, ShieldAlert, Sparkles } from "lucide-react";
import { evaluateMediaUpload } from "@/modules/media-analysis/upload-safety";
import { brand } from "@/config/brand";
import { learningTracks } from "../data";

export function CoachScreen() {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(15);
  const [throwType, setThrowType] = useState("Backhand drive");
  const [cameraAngle, setCameraAngle] = useState("Side view");
  const [goal, setGoal] = useState("Find one high-priority timing issue");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<{ accepted: boolean; messages: string[] } | null>(null);

  const validate = (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setStatus({ accepted: false, messages: ["Choose a photo or short video first."] });
      return;
    }
    const decision = evaluateMediaUpload({ fileName: file.name, mimeType: file.type, sizeBytes: file.size, durationSeconds: file.type.startsWith("video/") ? duration : null, consentToAnalyze: consent, userIsMinor: false, guardianConsent: false });
    setStatus({
      accepted: decision.accepted,
      messages: decision.accepted
        ? ["Upload checks passed and the file is ready for a private quarantine step.", "This GitHub Pages demo does not transmit the file or claim biomechanical analysis.", `Configured retention: ${decision.retentionDays} days after a real secure upload.`]
        : decision.reasons,
    });
  };

  return (
    <div className="screen coach-screen">
      <section className="screen-title compact-title"><div><span className="demo-eyebrow"><BookOpen /> Learning + coaching</span><h1>Improve one useful thing at a time.</h1><p>Structured lessons are usable now. Media coaching enforces consent and safety gates without pretending a static demo analyzed your mechanics.</p></div></section>
      <section className="learning-layout">
        <div className="learning-tracks">
          <div className="section-heading-row"><div><span className="demo-eyebrow">Your learning plan</span><h2>Three focused tracks</h2></div></div>
          {learningTracks.map((track) => <article key={track.title} className="learning-card"><span className="learning-level">{track.level}</span><div><h3>{track.title}</h3><p>Next: {track.next}</p><div className="lesson-progress"><i style={{ width: `${track.progress}%` }} /></div><small>{track.progress}% complete · App-recorded demo</small></div><button type="button" aria-label={`Open ${track.title}`}><ChevronRight /></button></article>)}
          <article className="practice-plan"><span className="spark-icon"><Sparkles /></span><div><span className="demo-eyebrow">Recommended today</span><h3>20-minute wind-control session</h3><p>Five neutral releases, five nose-down headwind shots, and ten landing-zone reps. Stop if you feel pain or unusual strain.</p></div></article>
        </div>
        <form className="workspace-card upload-lab" onSubmit={validate}>
          <div className="caddie-title"><span className="spark-icon"><Camera /></span><div><span className="demo-eyebrow">Private media readiness</span><h2>Prepare a coaching upload</h2></div></div>
          <label className="upload-drop"><input type="file" accept="image/jpeg,image/png,video/mp4,video/quicktime" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setStatus(null); }} /><FileVideo /><strong>{file ? file.name : "Choose a grip photo or throw video"}</strong><span>JPEG, PNG, MP4, or MOV · video up to 90 seconds · 250 MB</span></label>
          <div className="form-grid two"><label><span>Throw type</span><select value={throwType} onChange={(event) => setThrowType(event.target.value)}><option>Backhand drive</option><option>Forehand drive</option><option>Putting</option><option>Standstill approach</option></select></label><label><span>Camera angle</span><select value={cameraAngle} onChange={(event) => setCameraAngle(event.target.value)}><option>Side view</option><option>Rear view</option><option>Front view</option></select></label></div>
          {file?.type.startsWith("video/") ? <label><span>Approximate duration in seconds</span><input type="number" min="1" max="600" value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label> : null}
          <label><span>What should coaching prioritize?</span><textarea value={goal} onChange={(event) => setGoal(event.target.value)} rows={3} /></label>
          <label className="consent-box"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span><strong>I consent to private analysis of this selected media.</strong><small>No model-training use is permitted by this selection. In the static demo, the file never leaves this device.</small></span></label>
          <button className="demo-button primary wide" type="submit">Run upload safety check</button>
          {status ? <div className={status.accepted ? "readiness-result accepted" : "readiness-result rejected"} role="status">{status.accepted ? <Check /> : <ShieldAlert />}<div><strong>{status.accepted ? "Ready for secure provider handoff" : "Upload is not ready"}</strong>{status.messages.map((message) => <p key={message}>{message}</p>)}</div></div> : null}
          <div className="privacy-points"><span><LockKeyhole />Private by default</span><span>Signed access URLs</span><span>Delete media and result</span><span>Explicit coach sharing</span></div>
        </form>
      </section>
      <section className="coaching-boundary"><ShieldAlert /><div><h2>Honest analysis boundary</h2><p>A real launch still requires private object storage, malware scanning, transcoding isolation, an approved multimodal provider, consent logging, deletion jobs, and attorney review for identifiable media. Until those services are configured, {brand.productName} validates readiness but does not generate a fake form critique.</p></div></section>
    </div>
  );
}
