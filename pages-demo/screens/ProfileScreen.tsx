import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Check,
  CloudOff,
  Download,
  Eye,
  FileCheck2,
  LockKeyhole,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { downloadDemoData, initialDemoState, useDemoStore, type DemoPrivacySettings, type DemoProfile } from "../demo-store";
import { brand } from "@/config/brand";

const readinessItems = [
  { name: "Discovery, source attribution, and live map", state: "READY", note: "Usable in this static demo with a collapsible mobile map and accessible list fallback." },
  { name: "Course detail, claim submission, and audited review", state: "READY", note: "Evidence metadata and decisions work locally; production RBAC and private storage remain in the server application." },
  { name: "Capacity-safe booking and waitlist preview", state: "READY", note: "All fabricated inventory is isolated to the clearly fictional Forge Ridge fixture." },
  { name: "Social groups and safety controls", state: "READY", note: "Course, schedule, visibility, pace, skill, and approval choices persist locally." },
  { name: "Offline scoring, statistics, and bag intelligence", state: "READY", note: "Stored on this device with versioned score changes and per-hole context." },
  { name: "Explainable caddie and structured lessons", state: "READY", note: "Owned-disc guidance and interactive lesson progress work without pretending provider analysis occurred." },
  { name: "Tournament, league, owner pricing, and import rollback", state: "READY", note: "Interactive fictional workflows with no real charges or publication." },
  { name: "Public account identity and cross-device sync", state: "PROVIDER", note: "Use the account-enabled FlightForge deployment for server-backed signup, login, and cross-device profile storage." },
  { name: "Payments, payouts, taxes, and disputes", state: "PROVIDER", note: "Requires verified operators and Stripe Connect or equivalent credentials." },
  { name: "Photo/video coaching analysis", state: "PROVIDER", note: "Upload safety works; analysis awaits private storage, scanning, and an approved multimodal provider." },
  { name: "Security assessment and legal approval", state: "REVIEW", note: "Automated checks help, but penetration testing and attorney review remain external launch gates." },
] as const;

type ProfileDraft = {
  displayName: string;
  profile: DemoProfile;
  privacy: DemoPrivacySettings;
};

export function ProfileScreen() {
  const { state, update, reset, signOut, hydrated } = useDemoStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState<ProfileDraft>(() => profileDraft(state));

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const displayName = draft.displayName.trim();
    if (displayName.length < 2) {
      setStatus("Display name must contain at least two characters.");
      return;
    }
    update((current) => ({ ...current, displayName, profile: draft.profile, privacy: draft.privacy }));
    setStatus("Profile information and privacy choices saved on this device.");
  };

  const deleteData = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setStatus(`Select delete again to confirm removal of all ${brand.productName} demo data from this browser.`);
      return;
    }
    reset();
    setDraft(profileDraft(initialDemoState));
    setConfirmDelete(false);
    setStatus(`All ${brand.productName} demo data stored by this site on this browser has been deleted.`);
  };

  return (
    <div className="screen profile-screen">
      <section className="profile-hero">
        <div className="large-avatar">{initials(state.displayName)}</div>
        <div>
          <span className="demo-eyebrow"><UserRound aria-hidden="true" /> Device-local player profile</span>
          <h1>{state.displayName}</h1>
          <p>{state.profile.homeCity}, {state.profile.homeRegionCode} · {titleCase(state.profile.experienceLevel)} · {throwingHandLabel(state.profile.throwingHand)}</p>
          <div className="tag-row">
            <span>Social matching {state.privacy.socialMatchmaking ? "on" : "off"}</span>
            <span>{titleCase(state.privacy.profileVisibility)} profile</span>
            <span>City-level location only</span>
          </div>
        </div>
        <span className="local-account-pill"><CloudOff aria-hidden="true" />No cloud account</span>
      </section>

      <section className="profile-metrics">
        <article><strong>{state.rounds.length}</strong><span>App-recorded rounds</span></article>
        <article><strong>{state.favorites.length}</strong><span>Favorite courses</span></article>
        <article><strong>{state.reservations.length}</strong><span>Demo reservations</span></article>
        <article><strong>{state.discs.filter((disc) => disc.inBag).length}</strong><span>Discs in bag</span></article>
      </section>

      <section className="profile-grid">
        <form className="workspace-card privacy-card profile-edit-card" onSubmit={saveProfile}>
          <div className="card-heading plain">
            <div><span className="demo-eyebrow"><Eye aria-hidden="true" /> Profile &amp; privacy</span><h2>Set your game. Set your boundaries.</h2></div>
            <ShieldCheck aria-hidden="true" />
          </div>
          <div className="form-grid two">
            <label><span>Display name</span><input value={draft.displayName} minLength={2} maxLength={60} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} /></label>
            <label><span>Home city</span><input value={draft.profile.homeCity} maxLength={80} onChange={(event) => setDraft((current) => ({ ...current, profile: { ...current.profile, homeCity: event.target.value } }))} /></label>
            <label><span>Experience</span><select value={draft.profile.experienceLevel} onChange={(event) => setDraft((current) => ({ ...current, profile: { ...current.profile, experienceLevel: event.target.value as DemoProfile["experienceLevel"] } }))}><option value="NEW">Brand new</option><option value="BEGINNER">Beginner</option><option value="RECREATIONAL">Recreational</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option></select></label>
            <label><span>Throwing hand</span><select value={draft.profile.throwingHand} onChange={(event) => setDraft((current) => ({ ...current, profile: { ...current.profile, throwingHand: event.target.value as DemoProfile["throwingHand"] } }))}><option value="RIGHT">Right</option><option value="LEFT">Left</option><option value="AMBIDEXTROUS">Both</option><option value="PREFER_NOT_TO_SAY">Prefer not to say</option></select></label>
          </div>
          <label className="preference-row"><span><strong>Profile visibility</strong><small>Who may see your city, experience, and public achievements</small></span><select aria-label="Profile visibility" value={draft.privacy.profileVisibility} onChange={(event) => setDraft((current) => ({ ...current, privacy: { ...current.privacy, profileVisibility: event.target.value as DemoPrivacySettings["profileVisibility"] } }))}><option value="PRIVATE">Only me</option><option value="FRIENDS">Connections</option><option value="PUBLIC">Public</option></select></label>
          <PreferenceToggle label="Social matchmaking" description="Allow compatible public game suggestions" checked={draft.privacy.socialMatchmaking} onChange={(value) => setDraft((current) => ({ ...current, privacy: { ...current.privacy, socialMatchmaking: value } }))} />
          <PreferenceToggle label="Nonessential analytics" description="Off by default; never required for core play" checked={draft.privacy.analyticsOptIn} onChange={(value) => setDraft((current) => ({ ...current, privacy: { ...current.privacy, analyticsOptIn: value } }))} />
          <PreferenceToggle label="AI recommendations" description="Use local profile inputs in the heuristic caddie" checked={draft.privacy.aiRecommendations} onChange={(value) => setDraft((current) => ({ ...current, privacy: { ...current.privacy, aiRecommendations: value } }))} />
          <div className="privacy-note"><LockKeyhole aria-hidden="true" />Precise home address is never requested. Browser data is not transmitted by this Pages edition.</div>
          <button className="demo-button primary wide" type="submit">Save profile and privacy</button>
        </form>

        <div className="workspace-card data-rights-card">
          <div className="card-heading plain"><div><span className="demo-eyebrow"><FileCheck2 aria-hidden="true" /> Data rights &amp; session</span><h2>Export, erase, or sign out</h2></div><Download aria-hidden="true" /></div>
          <p>The export includes profile choices, privacy controls, bag, reservations, groups, scorecards, registrations, claims, conditions, and import history.</p>
          <button className="demo-button secondary wide" type="button" onClick={() => { downloadDemoData(state); setStatus("Personal data export downloaded."); }} disabled={!hydrated}><Download aria-hidden="true" />Download my data</button>
          <button className={`demo-button wide ${confirmDelete ? "danger-button" : "tertiary"}`} type="button" onClick={deleteData}><Trash2 aria-hidden="true" />{confirmDelete ? "Confirm delete all local data" : "Delete local data"}</button>
          <button className="demo-button tertiary wide demo-signout-action" type="button" onClick={signOut}><LogOut aria-hidden="true" />Sign out of demo</button>
          <small className="session-note">Signing out hides this device-local workspace. It does not delete browser data.</small>
          <button className="text-action reset-action" type="button" onClick={() => { reset(); setDraft(profileDraft(initialDemoState)); setStatus("Fictional demonstration data restored."); }}><RotateCcw aria-hidden="true" />Restore fictional demo data</button>
          {status ? <p className="inline-status" role="status">{status}</p> : null}
        </div>
      </section>

      <section className="readiness-section">
        <div className="section-heading-row"><div><span className="demo-eyebrow">Launch readiness</span><h2>Implemented boundaries, not hidden limitations</h2><p>The GitHub Pages edition distinguishes working device-local capabilities from services that require a provider or professional review.</p></div></div>
        <div className="readiness-table" role="table" aria-label={`${brand.productName} feature readiness`}>
          <div className="readiness-row header" role="row"><span>Capability</span><span>Status</span><span>Boundary</span></div>
          {readinessItems.map((item) => <div className="readiness-row" key={item.name} role="row"><strong>{item.name}</strong><span className={`readiness-status ${item.state.toLowerCase()}`}>{item.state === "READY" ? <Check aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}{item.state === "READY" ? "Working demo" : item.state === "PROVIDER" ? "Provider required" : "External review"}</span><p>{item.note}</p></div>)}
        </div>
      </section>

      <section className="legal-grid"><article><h3>Privacy and media</h3><p>Production launch requires reviewed privacy, media-consent, biometric/body-motion, minors, retention, deletion, and state-law language.</p></article><article><h3>Commerce and course liability</h3><p>Marketplace payments, dynamic pricing, affiliate sales, tournament waivers, and course liability require attorney and provider review.</p></article><article><h3>Security operations</h3><p>Before public write-enabled commerce: penetration testing, malware scanning, monitoring, secret rotation, incident response, and abuse operations.</p></article></section>
    </div>
  );
}

function PreferenceToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="preference-row"><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function profileDraft(state: { displayName: string; profile: DemoProfile; privacy: DemoPrivacySettings }): ProfileDraft {
  return { displayName: state.displayName, profile: { ...state.profile }, privacy: { ...state.privacy } };
}

function initials(value: string): string {
  return value.split(/\s+/u).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "FF";
}

function titleCase(value: string): string {
  return value.toLowerCase().replace(/\b\w/gu, (character) => character.toUpperCase());
}

function throwingHandLabel(value: DemoProfile["throwingHand"]): string {
  if (value === "RIGHT") return "Right-hand thrower";
  if (value === "LEFT") return "Left-hand thrower";
  if (value === "AMBIDEXTROUS") return "Throws both hands";
  return "Throwing hand private";
}
