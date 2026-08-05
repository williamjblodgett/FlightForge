"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Disc3, Edit3, Gauge, Plus, RefreshCw, Sparkles, Trash2, Wind, X } from "lucide-react";
import type { ShotRecommendation } from "@/modules/ai-caddie/recommend-shot";
import { analyzeBag, type PlayerDisc } from "@/modules/bags/bag-intelligence";
import type { CatalogDisc, PlayerDiscRecord } from "@/modules/bags/bag-repository";

type Props = {
  initialDiscs: PlayerDiscRecord[];
  catalog: CatalogDisc[];
  controlledDistanceFeet: number | null;
  throwingHand: "RIGHT" | "LEFT";
  caddieEnabled: boolean;
};

type DiscForm = {
  catalogMoldId: string;
  manufacturerName: string;
  moldName: string;
  manualSpeed: string;
  manualGlide: string;
  manualTurn: string;
  manualFade: string;
  plastic: string;
  weightGrams: string;
  color: string;
  nickname: string;
  condition: PlayerDiscRecord["condition"];
  wearRating: number;
  domeProfile: "" | NonNullable<PlayerDiscRecord["domeProfile"]>;
  runName: string;
  status: PlayerDiscRecord["status"];
  notes: string;
};

type CaddieState = {
  distanceFeet: number;
  windMph: number;
  windDirection: "HEADWIND" | "TAILWIND" | "LEFT_TO_RIGHT" | "RIGHT_TO_LEFT" | "CALM";
  fairwayShape: "STRAIGHT" | "LEFT" | "RIGHT";
  throwType: "BACKHAND" | "FOREHAND";
  riskPreference: "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
  elevationChangeFeet: string;
  groundCondition: "NORMAL" | "WET" | "MUDDY" | "SNOW" | "ICY";
  hazardLevel: "NONE" | "LOW" | "MODERATE" | "HIGH";
};

type RecommendationResponse = { id: string; recommendation: ShotRecommendation };

export function BagWorkspace({ initialDiscs, catalog, controlledDistanceFeet, throwingHand, caddieEnabled }: Props) {
  const [discs, setDiscs] = useState(initialDiscs);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<PlayerDiscRecord | null>(null);
  const [discForm, setDiscForm] = useState<DiscForm>(() => emptyDiscForm());
  const [discBusy, setDiscBusy] = useState(false);
  const [discError, setDiscError] = useState<string | null>(null);
  const [caddie, setCaddie] = useState<CaddieState>({ distanceFeet: 300, windMph: 5, windDirection: "CALM", fairwayShape: "STRAIGHT", throwType: "BACKHAND", riskPreference: "BALANCED", elevationChangeFeet: "", groundCondition: "NORMAL", hazardLevel: "MODERATE" });
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [caddieBusy, setCaddieBusy] = useState(false);
  const [caddieError, setCaddieError] = useState<string | null>(null);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState("SUCCESS");
  const [flightAdjustment, setFlightAdjustment] = useState("AS_EXPECTED");
  const [actualDistance, setActualDistance] = useState("");
  const caddieDiscs = useMemo(() => discs.map(toPlayerDisc), [discs]);
  const analysis = useMemo(() => analyzeBag(caddieDiscs), [caddieDiscs]);
  const activeCount = discs.filter((disc) => disc.status === "IN_BAG").length;
  const learnedCount = discs.filter((disc) => disc.profiles.some((profile) => profile.sampleCount > 0)).length;

  function startAdd() { setEditing(null); setDiscForm(emptyDiscForm()); setDiscError(null); setShowEditor(true); }
  function startEdit(disc: PlayerDiscRecord) { setEditing(disc); setDiscForm(formFromDisc(disc)); setDiscError(null); setShowEditor(true); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function setDisc<K extends keyof DiscForm>(key: K, value: DiscForm[K]) { setDiscForm((current) => ({ ...current, [key]: value })); }
  function selectCatalog(id: string) {
    const match = catalog.find((disc) => disc.id === id);
    setDiscForm((current) => ({ ...current, catalogMoldId: id, manufacturerName: match?.manufacturer ?? "", moldName: match?.mold ?? "", plastic: match?.plastics[0] ?? "" }));
  }

  async function saveDisc(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setDiscBusy(true); setDiscError(null);
    const payload = discPayload(discForm, editing?.version);
    try {
      const response = await fetch(editing ? `/api/bag/${editing.id}` : "/api/bag", { method: editing ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) { setDiscError(body.error?.message ?? "The disc could not be saved."); return; }
      await refreshBag(); setShowEditor(false); setEditing(null); setDiscForm(emptyDiscForm());
    } catch { setDiscError("The bag service could not be reached. Your entries remain in this form."); }
    finally { setDiscBusy(false); }
  }

  async function removeDisc(disc: PlayerDiscRecord) {
    if (!window.confirm(`Remove ${disc.nickname || disc.moldName} from your collection? Recorded throw profiles for this disc will no longer appear in your bag.`)) return;
    setDiscError(null);
    try {
      const response = await fetch(`/api/bag/${disc.id}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ version: disc.version }) });
      if (!response.ok) { const body = await response.json() as { error?: { message?: string } }; setDiscError(body.error?.message ?? "The disc could not be removed."); return; }
      await refreshBag();
    } catch { setDiscError("The bag service could not be reached."); }
  }

  async function refreshBag() {
    const response = await fetch("/api/bag", { cache: "no-store" });
    if (!response.ok) throw new Error("Bag refresh failed");
    const body = await response.json() as { discs: PlayerDiscRecord[] };
    setDiscs(body.discs);
  }

  async function requestCaddie(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setCaddieBusy(true); setCaddieError(null); setRecommendation(null); setFeedbackSaved(false);
    if (!caddieEnabled) { setCaddieBusy(false); setCaddieError("The caddie is temporarily paused. Your bag remains available."); return; }
    try {
      const response = await fetch("/api/caddie/recommendations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...caddie, throwingHand, controlledDistanceFeet, elevationChangeFeet: caddie.elevationChangeFeet ? Number(caddie.elevationChangeFeet) : null, groundCondition: caddie.groundCondition, hazardLevel: caddie.hazardLevel }) });
      const body = await response.json() as RecommendationResponse & { error?: { message?: string } };
      if (!response.ok) { setCaddieError(body.error?.message ?? "The caddie could not build a recommendation."); return; }
      setRecommendation(body);
    } catch { setCaddieError("The caddie service could not be reached. Your bag remains available."); }
    finally { setCaddieBusy(false); }
  }

  async function saveFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedId = recommendation?.recommendation.primaryDiscId;
    if (!recommendation || !selectedId) return;
    setCaddieBusy(true); setCaddieError(null);
    try {
      const response = await fetch(`/api/caddie/recommendations/${recommendation.id}/feedback`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ playerDiscId: selectedId, throwType: caddie.throwType, intendedShape: caddie.fairwayShape, result: feedbackResult, flightAdjustment, missDirection: feedbackResult === "SUCCESS" ? "NONE" : feedbackResult === "SHORT" ? "SHORT" : feedbackResult === "LONG" ? "LONG" : null, distanceFeet: actualDistance ? Number(actualDistance) : null, windMph: caddie.windMph, windDirection: caddie.windDirection, representative: true, comment: null }) });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) { setCaddieError(body.error?.message ?? "The feedback could not be saved."); return; }
      await refreshBag(); setFeedbackSaved(true);
    } catch { setCaddieError("The feedback service could not be reached."); }
    finally { setCaddieBusy(false); }
  }

  const selectedCatalog = catalog.find((disc) => disc.id === discForm.catalogMoldId) ?? null;
  return <div className="bag-workspace">
    <section className="bag-command-bar"><div><span className="eyebrow"><Disc3 aria-hidden="true" /> Digital bag</span><h1>Your discs are the caddie’s equipment map.</h1><p>Record each physical disc separately. Manufacturer ratings remain attributed; wear and your representative throws create a private personalized layer.</p></div><button className="button button-primary" type="button" onClick={showEditor ? () => setShowEditor(false) : startAdd}>{showEditor ? <><X aria-hidden="true" />Close editor</> : <><Plus aria-hidden="true" />Add a disc</>}</button></section>

    <section className="bag-metrics" aria-label="Bag summary"><div><strong>{activeCount}</strong><span>Carried now</span></div><div><strong>{discs.length}</strong><span>Owned discs</span></div><div><strong>{learnedCount}</strong><span>Personalized</span></div><div><strong>{analysis.coverage}%</strong><span>Starter-role coverage</span></div></section>

    {showEditor ? <form className="disc-editor" onSubmit={saveDisc}>
      <div className="disc-editor-heading"><div><span className="eyebrow">{editing ? "Edit physical disc" : "Add physical disc"}</span><h2>{editing ? editing.nickname || editing.moldName : "Match the disc, then record your copy"}</h2></div><span className="disc-editor-step">Catalog + personal layer</span></div>
      <div className="disc-editor-grid">
        <label className="editor-span-2"><span>Manufacturer catalog match</span><select value={discForm.catalogMoldId} onChange={(event) => selectCatalog(event.target.value)}><option value="">Custom or unlisted disc</option>{catalog.map((disc) => <option key={disc.id} value={disc.id}>{disc.manufacturer} · {disc.mold} · {disc.speed}/{disc.glide}/{disc.turn}/{disc.fade}</option>)}</select></label>
        {selectedCatalog ? <div className="catalog-match editor-span-2"><Disc3 aria-hidden="true" /><div><strong>{selectedCatalog.manufacturer} {selectedCatalog.mold}</strong><span>{selectedCatalog.category.replaceAll("_", " ").toLowerCase()} · {selectedCatalog.speed} / {selectedCatalog.glide} / {selectedCatalog.turn} / {selectedCatalog.fade}</span><a href={selectedCatalog.ratingSourceUrl} target="_blank" rel="noreferrer">Baseline: {selectedCatalog.ratingSource}</a></div></div> : <><label><span>Manufacturer</span><input required value={discForm.manufacturerName} onChange={(event) => setDisc("manufacturerName", event.target.value)} /></label><label><span>Mold</span><input required value={discForm.moldName} onChange={(event) => setDisc("moldName", event.target.value)} /></label><div className="manual-flight editor-span-2"><span>User-entered printed ratings</span>{(["manualSpeed", "manualGlide", "manualTurn", "manualFade"] as const).map((key) => <label key={key}><span>{key.replace("manual", "")}</span><input required type="number" step="0.5" min={key === "manualTurn" ? -5 : 0} max={key === "manualSpeed" ? 15 : key === "manualGlide" ? 7 : 6} value={discForm[key]} onChange={(event) => setDisc(key, event.target.value)} /></label>)}</div></>}
        <label><span>Plastic</span>{selectedCatalog ? <select value={discForm.plastic} onChange={(event) => setDisc("plastic", event.target.value)}><option value="">Unknown</option>{selectedCatalog.plastics.map((plastic) => <option key={plastic}>{plastic}</option>)}</select> : <input value={discForm.plastic} onChange={(event) => setDisc("plastic", event.target.value)} />}</label>
        <label><span>Exact weight (g) <small>Optional</small></span><input type="number" min={100} max={200} value={discForm.weightGrams} onChange={(event) => setDisc("weightGrams", event.target.value)} /></label>
        <label><span>Color <small>Optional</small></span><input maxLength={60} value={discForm.color} onChange={(event) => setDisc("color", event.target.value)} /></label>
        <label><span>Nickname <small>Optional</small></span><input maxLength={80} value={discForm.nickname} onChange={(event) => setDisc("nickname", event.target.value)} /></label>
        <label><span>Condition</span><select value={discForm.condition} onChange={(event) => setDisc("condition", event.target.value as DiscForm["condition"])}><option value="NEW">New</option><option value="GOOD">Good</option><option value="SEASONED">Seasoned</option><option value="BEAT_IN">Beat in</option></select></label>
        <label><span>Wear · {discForm.wearRating}/10</span><input type="range" min={0} max={10} value={discForm.wearRating} onChange={(event) => setDisc("wearRating", Number(event.target.value))} /></label>
        <label><span>Dome <small>Optional</small></span><select value={discForm.domeProfile} onChange={(event) => setDisc("domeProfile", event.target.value as DiscForm["domeProfile"])}><option value="">Unknown</option><option value="FLAT">Flat</option><option value="NEUTRAL">Neutral</option><option value="DOMEY">Domey</option></select></label>
        <label><span>Run or edition <small>Optional</small></span><input maxLength={100} value={discForm.runName} onChange={(event) => setDisc("runName", event.target.value)} /></label>
        <label><span>Status</span><select value={discForm.status} onChange={(event) => setDisc("status", event.target.value as DiscForm["status"])}><option value="IN_BAG">In current bag</option><option value="STORAGE">In storage</option><option value="LOST">Lost</option><option value="RETIRED">Retired</option><option value="REPLACEMENT_NEEDED">Replacement needed</option></select></label>
        <label className="editor-span-2"><span>Notes <small>Optional</small></span><textarea rows={3} maxLength={1000} value={discForm.notes} onChange={(event) => setDisc("notes", event.target.value)} /></label>
      </div>
      {discError ? <div className="form-error" role="alert">{discError}</div> : null}
      <div className="disc-editor-actions"><button className="button button-tertiary" type="button" onClick={() => setShowEditor(false)}>Cancel</button><button className="button button-primary" type="submit" disabled={discBusy}>{discBusy ? "Saving…" : editing ? "Save this disc" : "Add to collection"}</button></div>
    </form> : null}

    {discError && !showEditor ? <div className="form-error" role="alert">{discError}</div> : null}
    <section className="bag-caddie-layout">
      <div className="owned-disc-panel"><div className="panel-heading"><div><span className="eyebrow">Physical inventory</span><h2>{activeCount ? `${activeCount} ready for the course` : "Build your active bag"}</h2></div><button type="button" aria-label="Refresh bag" onClick={() => refreshBag().catch(() => setDiscError("The bag could not be refreshed."))}><RefreshCw aria-hidden="true" /></button></div>
        {discs.length ? <div className="owned-disc-list">{discs.map((disc) => { const profile = disc.profiles.find((item) => item.throwType === "BACKHAND"); return <article key={disc.id} className={disc.status !== "IN_BAG" ? "inactive-disc" : ""}><div className={`physical-disc ${disc.stability.toLowerCase()}`}><span>{disc.speed}</span></div><div className="owned-disc-copy"><div><span>{disc.nickname || disc.moldName}</span><b>{disc.status.replaceAll("_", " ").toLowerCase()}</b></div><strong>{disc.manufacturerName} · {disc.moldName}</strong><p>{[disc.plastic, disc.weightGrams ? `${disc.weightGrams}g` : null, `${disc.condition.toLowerCase()} · wear ${disc.wearRating}/10`].filter(Boolean).join(" · ")}</p><div className="disc-flight-line"><span>{disc.speed}</span><span>{disc.glide}</span><span>{profile?.observedTurn ?? disc.turn}</span><span>{profile?.observedFade ?? disc.fade}</span><small>{profile?.sampleCount ? `${profile.sampleCount} personal throws` : disc.ratingSource ? "manufacturer baseline" : "self-entered"}</small></div></div><div className="owned-disc-actions"><button type="button" onClick={() => startEdit(disc)} aria-label={`Edit ${disc.moldName}`}><Edit3 aria-hidden="true" /></button><button type="button" onClick={() => removeDisc(disc)} aria-label={`Remove ${disc.moldName}`}><Trash2 aria-hidden="true" /></button></div></article>; })}</div> : <div className="bag-empty"><Disc3 aria-hidden="true" /><strong>No discs in your collection yet.</strong><p>Add one physical disc. Catalog ratings prefill the baseline, and your own throws can refine it later.</p><button className="button button-primary" type="button" onClick={startAdd}>Add your first disc</button></div>}
        {discs.length ? <div className="bag-analysis"><div><CheckCircle2 aria-hidden="true" /><span><strong>{analysis.coverage}% starter-role coverage</strong><small>A simple coverage check—not a judgment of overall bag quality.</small></span></div>{analysis.missingSlots.length ? <div><AlertTriangle aria-hidden="true" /><span><strong>Open roles</strong><small>{analysis.missingSlots.join(" · ")}</small></span></div> : null}{analysis.overlaps.length ? <div><Disc3 aria-hidden="true" /><span><strong>Possible overlap</strong><small>{analysis.overlaps.map((pair) => pair.join(" + ")).join(" · ")}</small></span></div> : null}</div> : null}
      </div>

      <div className="production-caddie"><div className="caddie-heading"><span><Sparkles aria-hidden="true" /></span><div><span className="eyebrow">Explainable virtual caddie</span><h2>Build a shot from your actual bag</h2></div></div>
        <form className="caddie-form" onSubmit={requestCaddie}><label><span>Distance</span><div className="unit-input"><input type="number" min={50} max={1500} value={caddie.distanceFeet} onChange={(event) => setCaddie((current) => ({ ...current, distanceFeet: Number(event.target.value) }))} /><b>ft</b></div></label><label><span><Wind aria-hidden="true" />Wind</span><div className="split-input"><input type="number" min={0} max={80} value={caddie.windMph} onChange={(event) => setCaddie((current) => ({ ...current, windMph: Number(event.target.value) }))} /><select value={caddie.windDirection} onChange={(event) => setCaddie((current) => ({ ...current, windDirection: event.target.value as CaddieState["windDirection"] }))}><option value="CALM">Calm</option><option value="HEADWIND">Headwind</option><option value="TAILWIND">Tailwind</option><option value="LEFT_TO_RIGHT">Left → right</option><option value="RIGHT_TO_LEFT">Right → left</option></select></div></label><label><span>Throw</span><select value={caddie.throwType} onChange={(event) => setCaddie((current) => ({ ...current, throwType: event.target.value as CaddieState["throwType"] }))}><option value="BACKHAND">Backhand</option><option value="FOREHAND">Forehand</option></select></label><label><span>Desired finish</span><select value={caddie.fairwayShape} onChange={(event) => setCaddie((current) => ({ ...current, fairwayShape: event.target.value as CaddieState["fairwayShape"] }))}><option value="STRAIGHT">Straight</option><option value="LEFT">Left</option><option value="RIGHT">Right</option></select></label><label><span>Elevation change <small>Optional</small></span><div className="unit-input"><input type="number" min={-1000} max={1000} value={caddie.elevationChangeFeet} onChange={(event) => setCaddie((current) => ({ ...current, elevationChangeFeet: event.target.value }))} /><b>ft</b></div></label><label><span>Ground</span><select value={caddie.groundCondition} onChange={(event) => setCaddie((current) => ({ ...current, groundCondition: event.target.value as CaddieState["groundCondition"] }))}><option value="NORMAL">Normal</option><option value="WET">Wet</option><option value="MUDDY">Muddy</option><option value="SNOW">Snow</option><option value="ICY">Icy</option></select></label><label><span>Hazard level</span><select value={caddie.hazardLevel} onChange={(event) => setCaddie((current) => ({ ...current, hazardLevel: event.target.value as CaddieState["hazardLevel"] }))}><option value="NONE">None</option><option value="LOW">Low</option><option value="MODERATE">Moderate</option><option value="HIGH">High</option></select></label><label><span>Risk preference</span><select value={caddie.riskPreference} onChange={(event) => setCaddie((current) => ({ ...current, riskPreference: event.target.value as CaddieState["riskPreference"] }))}><option value="CONSERVATIVE">Conservative</option><option value="BALANCED">Balanced</option><option value="AGGRESSIVE">Aggressive</option></select></label><button className="button button-primary button-wide" type="submit" disabled={caddieBusy || activeCount === 0}><Sparkles aria-hidden="true" />{caddieBusy ? "Building recommendation…" : activeCount ? "Recommend from my bag" : "Add an active disc first"}</button></form>
        {caddieError ? <div className="form-error" role="alert">{caddieError}</div> : null}
        {recommendation ? <article className="live-recommendation"><div className="recommendation-title"><span className="recommendation-disc"><Disc3 aria-hidden="true" /></span><div><small>Primary recommendation</small><h3>{recommendation.recommendation.primaryDisc}</h3><p>{recommendation.recommendation.shotType} · {recommendation.recommendation.power}</p></div><b className={`confidence-label ${recommendation.recommendation.confidenceLabel.toLowerCase()}`}>{recommendation.recommendation.confidenceLabel.toLowerCase()} confidence</b></div><div className="confidence-explanation"><Gauge aria-hidden="true" /><div><strong>{Math.round(recommendation.recommendation.confidence * 100)}% evidence score</strong><p>{recommendation.recommendation.confidenceBasis}</p></div></div><div className="recommendation-grid"><div><span>Release</span><p>{recommendation.recommendation.releaseAngle}</p></div><div><span>Execution cue</span><p>{recommendation.recommendation.executionCue}</p></div><div><span>Landing plan</span><p>{recommendation.recommendation.landingPlan}</p></div><div><span>Main risk</span><p>{recommendation.recommendation.mainRisk}</p></div></div><details><summary>Why this disc and alternatives</summary><ul>{recommendation.recommendation.reasoning.map((reason) => <li key={reason}>{reason}</li>)}</ul><p><strong>Safer:</strong> {recommendation.recommendation.conservativeAlternative}</p><p><strong>Aggressive:</strong> {recommendation.recommendation.aggressiveAlternative}</p><p><strong>Missing:</strong> {recommendation.recommendation.missingInformation.join(", ") || "No core inputs"}</p></details>{recommendation.recommendation.primaryDiscId && !feedbackSaved ? <form className="throw-feedback" onSubmit={saveFeedback}><strong>After the throw, teach your private disc profile</strong><div><label><span>Result</span><select value={feedbackResult} onChange={(event) => setFeedbackResult(event.target.value)}><option value="SUCCESS">Matched the plan</option><option value="SHORT">Finished short</option><option value="LONG">Finished long</option><option value="OFF_LINE">Missed the line</option><option value="OUT_OF_BOUNDS">Out of bounds</option></select></label><label><span>Flight compared with baseline</span><select value={flightAdjustment} onChange={(event) => setFlightAdjustment(event.target.value)}><option value="AS_EXPECTED">As expected</option><option value="MORE_UNDERSTABLE">More understable</option><option value="MORE_OVERSTABLE">More overstable</option></select></label><label><span>Measured distance <small>Optional</small></span><input type="number" min={1} max={1500} value={actualDistance} onChange={(event) => setActualDistance(event.target.value)} /></label></div><button className="button button-secondary" type="submit" disabled={caddieBusy}>Save representative throw</button></form> : null}{feedbackSaved ? <div className="feedback-success" role="status"><CheckCircle2 aria-hidden="true" />Saved. Future recommendations can use this representative throw.</div> : null}<p className="caddie-disclaimer">Flight estimates are not guarantees. Confirm conditions, course rules, bystanders, and safe landing areas before throwing.</p></article> : null}
      </div>
    </section>
  </div>;
}

function emptyDiscForm(): DiscForm { return { catalogMoldId: "", manufacturerName: "", moldName: "", manualSpeed: "7", manualGlide: "5", manualTurn: "0", manualFade: "1", plastic: "", weightGrams: "", color: "", nickname: "", condition: "GOOD", wearRating: 2, domeProfile: "", runName: "", status: "IN_BAG", notes: "" }; }
function formFromDisc(disc: PlayerDiscRecord): DiscForm { return { catalogMoldId: disc.catalogMoldId ?? "", manufacturerName: disc.manufacturerName, moldName: disc.moldName, manualSpeed: String(disc.speed), manualGlide: String(disc.glide), manualTurn: String(disc.turn), manualFade: String(disc.fade), plastic: disc.plastic ?? "", weightGrams: disc.weightGrams ? String(disc.weightGrams) : "", color: disc.color ?? "", nickname: disc.nickname ?? "", condition: disc.condition, wearRating: disc.wearRating, domeProfile: disc.domeProfile ?? "", runName: disc.runName ?? "", status: disc.status, notes: disc.notes ?? "" }; }
function discPayload(form: DiscForm, version?: number) { const catalog = Boolean(form.catalogMoldId); return { catalogMoldId: form.catalogMoldId || null, manufacturerName: form.manufacturerName, moldName: form.moldName, manualSpeed: catalog ? null : Number(form.manualSpeed), manualGlide: catalog ? null : Number(form.manualGlide), manualTurn: catalog ? null : Number(form.manualTurn), manualFade: catalog ? null : Number(form.manualFade), plastic: form.plastic || null, weightGrams: form.weightGrams ? Number(form.weightGrams) : null, color: form.color || null, nickname: form.nickname || null, condition: form.condition, wearRating: form.wearRating, domeProfile: form.domeProfile || null, runName: form.runName || null, status: form.status, notes: form.notes || null, ...(version ? { version } : {}) }; }
function toPlayerDisc(disc: PlayerDiscRecord): PlayerDisc { const profile = disc.profiles.find((item) => item.throwType === "BACKHAND"); return { id: disc.id, manufacturer: disc.manufacturerName, mold: disc.moldName, plastic: disc.plastic ?? undefined, weightGrams: disc.weightGrams ?? undefined, nickname: disc.nickname ?? undefined, speed: disc.speed, glide: disc.glide, turn: disc.turn, fade: disc.fade, stability: disc.stability, inBag: disc.status === "IN_BAG", observedDistanceFeet: profile?.typicalDistanceFeet ?? undefined, reliability: profile?.successRate ?? undefined, sampleCount: profile?.sampleCount ?? 0 }; }
