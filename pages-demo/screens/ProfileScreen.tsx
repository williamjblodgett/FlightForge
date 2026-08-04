import { useState } from "react";
import { AlertTriangle, Check, CloudOff, Download, Eye, FileCheck2, LockKeyhole, LogOut, RotateCcw, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { downloadDemoData, useDemoStore } from "../demo-store";
import { brand } from "@/config/brand";

const readinessItems = [
  { name: "Discovery, source attribution, and live map", state: "READY", note: "Usable in this static demo with an accessible list fallback." },
  { name: "Course detail, claim submission, and audited review", state: "READY", note: "Evidence metadata and decisions work locally; production RBAC and private storage remain in the server application." },
  { name: "Capacity-safe booking and waitlist preview", state: "READY", note: "Device-local demo; no payment or operator inventory is affected." },
  { name: "Social groups and safety controls", state: "READY", note: "Join and approval states work locally; messaging is not transmitted." },
  { name: "Offline scoring, statistics, and bag intelligence", state: "READY", note: "Stored on this device with versioned score changes." },
  { name: "Explainable caddie", state: "READY", note: "Deterministic heuristic using owned discs, confidence, and missing inputs." },
  { name: "Tournament, league, owner pricing, and import rollback", state: "READY", note: "Interactive fictional workflows with no real charges or publication." },
  { name: "Public account identity and cross-device sync", state: "PROVIDER", note: "Requires an established identity provider and production database." },
  { name: "Payments, payouts, taxes, and disputes", state: "PROVIDER", note: "Requires verified operators and Stripe Connect or equivalent credentials." },
  { name: "Photo/video coaching analysis", state: "PROVIDER", note: "Upload safety works; analysis awaits private storage, scanning, and an approved multimodal provider." },
  { name: "Security assessment and legal approval", state: "REVIEW", note: "Penetration testing and attorney review cannot be truthfully replaced by application code." },
] as const;

export function ProfileScreen() {
  const { state, reset, signOut, hydrated } = useDemoStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [status, setStatus] = useState("");

  const deleteData = () => {
    if (!confirmDelete) { setConfirmDelete(true); setStatus(`Select delete again to confirm removal of all ${brand.productName} demo data from this browser.`); return; }
    reset(); setConfirmDelete(false); setStatus(`All ${brand.productName} demo data stored by this site on this browser has been deleted.`);
  };

  return (
    <div className="screen profile-screen">
      <section className="profile-hero"><div className="large-avatar">RP</div><div><span className="demo-eyebrow"><UserRound /> Device-local player profile</span><h1>{state.displayName}</h1><p>Portland, Maine · Recreational · Right-hand backhand</p><div className="tag-row"><span>Social matching on</span><span>Balanced risk</span><span>City-level location only</span></div></div><span className="local-account-pill"><CloudOff />No cloud account</span></section>
      <section className="profile-metrics"><article><strong>{state.rounds.length}</strong><span>App-recorded rounds</span></article><article><strong>{state.favorites.length}</strong><span>Favorite courses</span></article><article><strong>{state.reservations.length}</strong><span>Demo reservations</span></article><article><strong>{state.discs.filter((disc) => disc.inBag).length}</strong><span>Discs in bag</span></article></section>

      <section className="profile-grid">
        <div className="workspace-card privacy-card"><div className="card-heading plain"><div><span className="demo-eyebrow"><Eye /> Privacy controls</span><h2>Choose what leaves your device</h2></div><ShieldCheck /></div><label className="preference-row"><span><strong>Profile visibility</strong><small>Who may see your city, experience, and public achievements</small></span><select defaultValue="FRIENDS"><option value="PRIVATE">Only me</option><option value="FRIENDS">Connections</option><option value="PUBLIC">Public</option></select></label><label className="preference-row"><span><strong>Social matchmaking</strong><small>Allow compatible public game suggestions</small></span><input type="checkbox" defaultChecked /></label><label className="preference-row"><span><strong>Nonessential analytics</strong><small>Static demo ships with this disabled</small></span><input type="checkbox" /></label><label className="preference-row"><span><strong>AI recommendations</strong><small>Use local profile inputs in the heuristic caddie</small></span><input type="checkbox" defaultChecked /></label><div className="privacy-note"><LockKeyhole />Precise home address is never requested. Browser data is not transmitted by this Pages edition.</div></div>
        <div className="workspace-card data-rights-card"><div className="card-heading plain"><div><span className="demo-eyebrow"><FileCheck2 /> Data rights &amp; session</span><h2>Export, erase, or sign out</h2></div><Download /></div><p>Download the complete local profile, bag, reservations, groups, scorecards, registrations, claims, conditions, and import history as JSON.</p><button className="demo-button secondary wide" type="button" onClick={() => { downloadDemoData(state); setStatus("Personal data export downloaded."); }} disabled={!hydrated}><Download />Download my data</button><button className={`demo-button wide ${confirmDelete ? "danger-button" : "tertiary"}`} type="button" onClick={deleteData}><Trash2 />{confirmDelete ? "Confirm delete all local data" : "Delete local data"}</button><button className="demo-button tertiary wide demo-signout-action" type="button" onClick={signOut}><LogOut />Sign out of demo</button><small className="session-note">Signing out hides this device-local workspace. It does not delete browser data.</small><button className="text-action reset-action" type="button" onClick={() => { reset(); setStatus("Fictional demonstration data restored."); }}><RotateCcw />Restore fictional demo data</button>{status ? <p className="inline-status" role="status">{status}</p> : null}</div>
      </section>

      <section className="readiness-section">
        <div className="section-heading-row"><div><span className="demo-eyebrow">Launch readiness</span><h2>Implemented boundaries, not hidden limitations</h2><p>The GitHub Pages edition distinguishes working device-local capabilities from services that inherently require credentials or professional review.</p></div></div>
        <div className="readiness-table" role="table" aria-label={`${brand.productName} feature readiness`}>
          <div className="readiness-row header" role="row"><span>Capability</span><span>Status</span><span>Boundary</span></div>
          {readinessItems.map((item) => <div className="readiness-row" key={item.name} role="row"><strong>{item.name}</strong><span className={`readiness-status ${item.state.toLowerCase()}`}>{item.state === "READY" ? <Check /> : <AlertTriangle />}{item.state === "READY" ? "Working demo" : item.state === "PROVIDER" ? "Provider required" : "External review"}</span><p>{item.note}</p></div>)}
        </div>
      </section>

      <section className="legal-grid"><article><h3>Privacy and media</h3><p>Production launch requires reviewed privacy, media-consent, biometric/body-motion, minors, retention, deletion, and state-law language.</p></article><article><h3>Commerce and course liability</h3><p>Marketplace payments, dynamic pricing, affiliate sales, tournament waivers, and course liability require attorney and provider review.</p></article><article><h3>Security operations</h3><p>Before a public write-enabled launch: penetration test, malware scanner, edge headers, monitoring, secret rotation, incident response, and abuse operations.</p></article></section>
    </div>
  );
}
