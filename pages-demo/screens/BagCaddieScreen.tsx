import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Disc3, Gauge, Plus, Sparkles, Wind } from "lucide-react";
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

  return (
    <div className="screen bag-screen">
      <section className="screen-title compact-title"><div><span className="demo-eyebrow"><Disc3 /> Digital bag + caddie</span><h1>Recommend the shot I can actually throw.</h1><p>{brand.productName} starts with the discs in your bag, explains the tradeoff, and discloses confidence instead of pretending every variable is known.</p></div><button className="demo-button secondary" type="button" onClick={() => setShowAdd((open) => !open)}><Plus />Add disc</button></section>
      {showAdd ? <AddDiscForm onAdd={(disc) => { update((current) => ({ ...current, discs: [...current.discs, disc] })); setShowAdd(false); }} /> : null}
      <section className="bag-overview-grid">
        <div className="workspace-card bag-inventory">
          <div className="card-heading plain"><div><span className="demo-eyebrow">In the bag</span><h2>{state.discs.filter((disc) => disc.inBag).length} active discs</h2></div><div className="coverage-ring" style={{ "--coverage": `${analysis.coverage * 3.6}deg` } as React.CSSProperties}><strong>{analysis.coverage}%</strong><span>coverage</span></div></div>
          <div className="disc-table" role="table" aria-label="Digital disc bag">
            <div className="disc-row header" role="row"><span>Disc</span><span>Flight</span><span>Stability</span><span>Carry</span></div>
            {state.discs.map((disc) => <div key={disc.id} className="disc-row" role="row"><span><i className={`disc-swatch ${disc.stability.toLowerCase()}`} /><b>{disc.mold}</b><small>{disc.manufacturer}</small></span><span>{disc.speed} / {disc.glide} / {disc.turn} / {disc.fade}</span><span>{disc.stability.toLowerCase()}</span><span><label className="switch"><input type="checkbox" checked={disc.inBag} onChange={() => toggleDisc(disc.id)} /><i /></label></span></div>)}
          </div>
          <div className="bag-analysis"><div><CheckCircle2 /><span><strong>{analysis.coverage}% functional coverage</strong><small>Based on five practical speed/stability slots</small></span></div>{analysis.missingSlots.length > 0 ? <div><AlertTriangle /><span><strong>Open slots</strong><small>{analysis.missingSlots.join(" · ")}</small></span></div> : null}{analysis.overlaps.length > 0 ? <div><Disc3 /><span><strong>Possible overlap</strong><small>{analysis.overlaps.map((pair) => pair.join(" + ")).join(" · ")}</small></span></div> : null}</div>
        </div>
        <div className="workspace-card caddie-panel">
          <div className="caddie-title"><span className="spark-icon"><Sparkles /></span><div><span className="demo-eyebrow">Explainable caddie</span><h2>Build the next shot</h2></div></div>
          <div className="caddie-inputs">
            <label><span>Hole distance <b>{distance} ft</b></span><input type="range" min="120" max="520" step="5" value={distance} onChange={(event) => setDistance(Number(event.target.value))} /></label>
            <label><span><Wind />Wind</span><div className="inline-fields"><input type="number" min="0" max="50" value={windSpeed} onChange={(event) => setWindSpeed(Number(event.target.value))} aria-label="Wind speed in miles per hour" /><select value={windDirection} onChange={(event) => setWindDirection(event.target.value as CaddieInput["windDirection"])}><option value="CALM">Calm</option><option value="HEADWIND">Headwind</option><option value="TAILWIND">Tailwind</option><option value="CROSSWIND">Crosswind</option></select></div></label>
            <div className="form-grid two"><label><span>Fairway finish</span><select value={shape} onChange={(event) => setShape(event.target.value as CaddieInput["fairwayShape"])}><option value="STRAIGHT">Straight</option><option value="LEFT">Finish left</option><option value="RIGHT">Finish right</option></select></label><label><span>Risk preference</span><select value={risk} onChange={(event) => setRisk(event.target.value as CaddieInput["riskPreference"])}><option value="CONSERVATIVE">Conservative</option><option value="BALANCED">Balanced</option><option value="AGGRESSIVE">Aggressive</option></select></label></div>
          </div>
          <article className="recommendation-card">
            <div className="recommendation-top"><span className="disc-recommendation-art">◎</span><div><span>Primary recommendation</span><h3>{recommendation.primaryDisc}</h3><p>{recommendation.shotType} · {recommendation.power}</p></div><span className={`risk-badge ${recommendation.risk.toLowerCase()}`}>{recommendation.risk.toLowerCase()} risk</span></div>
            <div className="confidence-row"><span>Confidence</span><div><i style={{ width: `${recommendation.confidence * 100}%` }} /></div><strong>{Math.round(recommendation.confidence * 100)}%</strong></div>
            <div className="reason-grid"><div><span>Why it fits</span><ul>{recommendation.reasoning.map((reason) => <li key={reason}>{reason}</li>)}</ul></div><div><span>Execution cue</span><p>{recommendation.executionCue}</p></div><div><span>Landing plan</span><p>{recommendation.landingPlan}</p></div></div>
            <details><summary>Alternatives and missing information</summary><div className="alternative-grid"><p><strong>Safer:</strong> {recommendation.conservativeAlternative}</p><p><strong>Aggressive:</strong> {recommendation.aggressiveAlternative}</p><p><strong>Missing:</strong> {recommendation.missingInformation.length ? recommendation.missingInformation.join(", ") : "No required profile inputs"}</p></div></details>
          </article>
          <p className="demo-disclosure"><Gauge /> Heuristic demo—not a guarantee of flight or safety. No purchase is required, and no retailer is favored.</p>
        </div>
      </section>
    </div>
  );
}

function AddDiscForm({ onAdd }: { onAdd: (disc: PlayerDisc) => void }) {
  const [manufacturer, setManufacturer] = useState("");
  const [mold, setMold] = useState("");
  const [speed, setSpeed] = useState(7);
  const [stability, setStability] = useState<DiscStability>("STABLE");
  return <form className="add-disc-panel" onSubmit={(event) => { event.preventDefault(); if (!manufacturer.trim() || !mold.trim()) return; onAdd({ id: `disc-${Date.now()}`, manufacturer: manufacturer.trim(), mold: mold.trim(), speed, glide: 5, turn: stability === "UNDERSTABLE" ? -2 : 0, fade: stability === "OVERSTABLE" ? 3 : 1, stability, inBag: true }); }}><label><span>Manufacturer</span><input value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} required /></label><label><span>Mold</span><input value={mold} onChange={(event) => setMold(event.target.value)} required /></label><label><span>Speed</span><input type="number" min="1" max="15" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></label><label><span>Stability</span><select value={stability} onChange={(event) => setStability(event.target.value as DiscStability)}><option value="UNDERSTABLE">Understable</option><option value="STABLE">Stable</option><option value="OVERSTABLE">Overstable</option></select></label><button className="demo-button primary" type="submit">Add to bag</button></form>;
}
