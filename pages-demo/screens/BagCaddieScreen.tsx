import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Disc3, Edit3, Gauge, Plus, Sparkles, Trash2, Wind, X } from "lucide-react";
import { recommendShot, type CaddieInput } from "@/modules/ai-caddie/recommend-shot";
import { analyzeBag, type DiscStability, type PlayerDisc } from "@/modules/bags/bag-intelligence";
import { useDemoStore } from "../demo-store";
import { brand } from "@/config/brand";

export function BagCaddieScreen() {
  const { state, update } = useDemoStore();
  const [distance, setDistance] = useState(315);
  const [windSpeed, setWindSpeed] = useState(12);
  const [windDirection, setWindDirection] = useState<CaddieInput["windDirection"]>("HEADWIND");
  const [shape, setShape] = useState<CaddieInput["fairwayShape"]>("LEFT");
  const [risk, setRisk] = useState<CaddieInput["riskPreference"]>("BALANCED");
  const [showAdd, setShowAdd] = useState(false);
  const [editingDiscId, setEditingDiscId] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const analysis = useMemo(() => analyzeBag(state.discs), [state.discs]);
  const recommendation = useMemo(() => recommendShot({
    distanceFeet: distance,
    windMph: windSpeed,
    windDirection,
    fairwayShape: shape,
    throwingHand: "RIGHT",
    controlledDistanceFeet: 360,
    riskPreference: risk,
    discs: state.discs,
  }), [distance, risk, shape, state.discs, windDirection, windSpeed]);
  const toggleDisc = (discId: string) => update((current) => ({ ...current, discs: current.discs.map((disc) => disc.id === discId ? { ...disc, inBag: !disc.inBag } : disc) }));
  const saveDisc = (disc: PlayerDisc) => update((current) => ({ ...current, discs: current.discs.some((item) => item.id === disc.id) ? current.discs.map((item) => item.id === disc.id ? disc : item) : [...current.discs, disc] }));
  const removeDisc = (discId: string) => {
    if (pendingRemoveId !== discId) { setPendingRemoveId(discId); return; }
    update((current) => ({ ...current, discs: current.discs.filter((disc) => disc.id !== discId) }));
    setPendingRemoveId(null);
    if (editingDiscId === discId) { setEditingDiscId(null); setShowAdd(false); }
  };

  return (
    <div className="screen bag-screen">
      <section className="screen-title compact-title"><div><span className="demo-eyebrow"><Disc3 /> Digital bag + caddie</span><h1>Recommend the shot I can actually throw.</h1><p>{brand.productName} starts with the discs in your bag, explains the tradeoff, and discloses confidence instead of pretending every variable is known.</p></div><button className="demo-button secondary" type="button" onClick={() => { setEditingDiscId(null); setShowAdd((open) => !open); }}>{showAdd && !editingDiscId ? <><X />Close</> : <><Plus />Add disc</>}</button></section>
      {showAdd ? <AddDiscForm key={editingDiscId ?? "new"} existing={state.discs.find((disc) => disc.id === editingDiscId) ?? null} onSave={(disc) => { saveDisc(disc); setShowAdd(false); setEditingDiscId(null); }} onCancel={() => { setShowAdd(false); setEditingDiscId(null); }} /> : null}
      <section className="bag-overview-grid">
        <div className="workspace-card bag-inventory">
          <div className="card-heading plain"><div><span className="demo-eyebrow">In the bag</span><h2>{state.discs.filter((disc) => disc.inBag).length} active discs</h2></div><div className="coverage-ring" style={{ "--coverage": `${analysis.coverage * 3.6}deg` } as React.CSSProperties}><strong>{analysis.coverage}%</strong><span>coverage</span></div></div>
          <div className="disc-table" role="table" aria-label="Digital disc bag">
            <div className="disc-row header" role="row"><span>Disc</span><span>Flight</span><span>Stability</span><span>Carry</span><span>Actions</span></div>
            {state.discs.map((disc) => <div key={disc.id} className="disc-row" role="row"><span><i className={`disc-swatch ${disc.stability.toLowerCase()}`} /><b>{disc.nickname || disc.mold}</b><small>{disc.manufacturer} · {disc.mold}{disc.plastic ? ` · ${disc.plastic}` : ""}{disc.weightGrams ? ` · ${disc.weightGrams}g` : ""}</small></span><span>{disc.speed} / {disc.glide} / {disc.turn} / {disc.fade}</span><span>{disc.stability.toLowerCase()}</span><span><label className="switch"><span className="sr-only">Carry {disc.manufacturer} {disc.mold}</span><input type="checkbox" aria-label={`Carry ${disc.manufacturer} ${disc.mold}`} checked={disc.inBag} onChange={() => toggleDisc(disc.id)} /><i /></label></span><span className="disc-actions"><button type="button" aria-label={`Edit ${disc.manufacturer} ${disc.mold}`} onClick={() => { setEditingDiscId(disc.id); setShowAdd(true); setPendingRemoveId(null); }}><Edit3 /></button><button type="button" className={pendingRemoveId === disc.id ? "confirm-remove" : ""} aria-label={pendingRemoveId === disc.id ? `Confirm remove ${disc.manufacturer} ${disc.mold}` : `Remove ${disc.manufacturer} ${disc.mold}`} onClick={() => removeDisc(disc.id)}><Trash2 /></button></span></div>)}
          </div>
          <div className="bag-analysis"><div><CheckCircle2 /><span><strong>{analysis.coverage}% of five starter roles covered</strong><small>Checks understable fairway, stable midrange, overstable approach, neutral putter, and wind driver—not overall bag quality.</small></span></div>{analysis.missingSlots.length > 0 ? <div><AlertTriangle /><span><strong>Open roles</strong><small>{analysis.missingSlots.join(" · ")}</small></span></div> : null}{analysis.overlaps.length > 0 ? <div><Disc3 /><span><strong>Possible overlap</strong><small>{analysis.overlaps.map((pair) => pair.join(" + ")).join(" · ")}</small></span></div> : null}</div>
        </div>
        <div className="workspace-card caddie-panel">
          <div className="caddie-title"><span className="spark-icon"><Sparkles /></span><div><span className="demo-eyebrow">Explainable caddie</span><h2>Build the next shot</h2></div></div>
          <div className="caddie-inputs">
            <label><span>Hole distance <b>{distance} ft</b></span><input type="range" min="120" max="520" step="5" value={distance} onChange={(event) => setDistance(Number(event.target.value))} /></label>
            <label><span><Wind />Wind</span><div className="inline-fields"><input type="number" min="0" max="50" value={windSpeed} onChange={(event) => setWindSpeed(Number(event.target.value))} aria-label="Wind speed in miles per hour" /><select aria-label="Wind direction" value={windDirection} onChange={(event) => setWindDirection(event.target.value as CaddieInput["windDirection"])}><option value="CALM">Calm</option><option value="HEADWIND">Headwind</option><option value="TAILWIND">Tailwind</option><option value="CROSSWIND">Crosswind</option></select></div></label>
            <div className="form-grid two"><label><span>Fairway finish</span><select value={shape} onChange={(event) => setShape(event.target.value as CaddieInput["fairwayShape"])}><option value="STRAIGHT">Straight</option><option value="LEFT">Finish left</option><option value="RIGHT">Finish right</option></select></label><label><span>Risk preference</span><select value={risk} onChange={(event) => setRisk(event.target.value as CaddieInput["riskPreference"])}><option value="CONSERVATIVE">Conservative</option><option value="BALANCED">Balanced</option><option value="AGGRESSIVE">Aggressive</option></select></label></div>
          </div>
          <article className="recommendation-card">
            <div className="recommendation-top"><span className="disc-recommendation-art">◎</span><div><span>Primary recommendation</span><h3>{recommendation.primaryDisc}</h3><p>{recommendation.shotType} · {recommendation.power}</p></div><span className={`risk-badge ${recommendation.risk.toLowerCase()}`}>{recommendation.risk.toLowerCase()} risk</span></div>
            <div className="confidence-row"><span>Confidence</span><div><i style={{ width: `${recommendation.confidence * 100}%` }} /></div><strong>{Math.round(recommendation.confidence * 100)}%</strong></div>
            <div className="reason-grid"><div><span>Why it fits</span><ul>{recommendation.reasoning.map((reason) => <li key={reason}>{reason}</li>)}</ul></div><div><span>Execution cue</span><p>{recommendation.executionCue}</p></div><div><span>Landing plan</span><p>{recommendation.landingPlan}</p></div></div>
            <details><summary>Alternatives and missing information</summary><div className="alternative-grid"><p><strong>Safer:</strong> {recommendation.conservativeAlternative}</p><p><strong>Aggressive:</strong> {recommendation.aggressiveAlternative}</p><p><strong>Missing:</strong> {recommendation.missingInformation.length ? recommendation.missingInformation.join(", ") : "No required profile inputs"}</p></div></details>
          </article>
          <p className="demo-disclosure"><Gauge /> Uses distance, wind, fairway finish, stated risk, throwing hand, controlled distance, and active bag. It does not yet know elevation, obstacles, ground conditions, or tournament position. Heuristic demo—not a guarantee of flight or safety.</p>
        </div>
      </section>
    </div>
  );
}

function AddDiscForm({ existing, onSave, onCancel }: { existing: PlayerDisc | null; onSave: (disc: PlayerDisc) => void; onCancel: () => void }) {
  const [manufacturer, setManufacturer] = useState(existing?.manufacturer ?? "");
  const [mold, setMold] = useState(existing?.mold ?? "");
  const [plastic, setPlastic] = useState(existing?.plastic ?? "");
  const [weightGrams, setWeightGrams] = useState(existing?.weightGrams ?? 175);
  const [color, setColor] = useState(existing?.color ?? "");
  const [nickname, setNickname] = useState(existing?.nickname ?? "");
  const [speed, setSpeed] = useState(existing?.speed ?? 7);
  const [glide, setGlide] = useState(existing?.glide ?? 5);
  const [turn, setTurn] = useState(existing?.turn ?? 0);
  const [fade, setFade] = useState(existing?.fade ?? 1);
  const [stability, setStability] = useState<DiscStability>(existing?.stability ?? "STABLE");

  return <form className="add-disc-panel expanded" onSubmit={(event) => { event.preventDefault(); if (!manufacturer.trim() || !mold.trim()) return; onSave({ id: existing?.id ?? `disc-${Date.now()}`, manufacturer: manufacturer.trim(), mold: mold.trim(), plastic: plastic.trim() || undefined, weightGrams, color: color.trim() || undefined, nickname: nickname.trim() || undefined, speed, glide, turn, fade, stability, inBag: existing?.inBag ?? true }); }}>
    <div className="add-disc-heading"><div><span className="demo-eyebrow">{existing ? "Edit owned disc" : "Add owned disc"}</span><h2>{existing ? `${existing.manufacturer} ${existing.mold}` : "Record the actual disc"}</h2></div><button type="button" onClick={onCancel} aria-label="Close disc form"><X /></button></div>
    <div className="form-grid disc-identity-grid"><label><span>Manufacturer</span><input value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} required /></label><label><span>Mold</span><input value={mold} onChange={(event) => setMold(event.target.value)} required /></label><label><span>Plastic</span><input value={plastic} onChange={(event) => setPlastic(event.target.value)} placeholder="Optional" /></label><label><span>Weight (g)</span><input type="number" min="100" max="200" value={weightGrams} onChange={(event) => setWeightGrams(Number(event.target.value))} /></label><label><span>Color</span><input value={color} onChange={(event) => setColor(event.target.value)} placeholder="Optional" /></label><label><span>Nickname</span><input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="Optional" /></label></div>
    <fieldset className="flight-number-fieldset"><legend>Flight numbers</legend><label><span>Speed</span><input type="number" min="1" max="15" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></label><label><span>Glide</span><input type="number" min="1" max="7" value={glide} onChange={(event) => setGlide(Number(event.target.value))} /></label><label><span>Turn</span><input type="number" min="-5" max="1" value={turn} onChange={(event) => setTurn(Number(event.target.value))} /></label><label><span>Fade</span><input type="number" min="0" max="5" value={fade} onChange={(event) => setFade(Number(event.target.value))} /></label><label><span>Stability</span><select value={stability} onChange={(event) => setStability(event.target.value as DiscStability)}><option value="UNDERSTABLE">Understable</option><option value="STABLE">Stable</option><option value="OVERSTABLE">Overstable</option></select></label></fieldset>
    <div className="add-disc-actions"><button className="demo-button secondary" type="button" onClick={onCancel}>Cancel</button><button className="demo-button primary" type="submit">{existing ? "Save disc" : "Add to bag"}</button></div>
  </form>;
}
