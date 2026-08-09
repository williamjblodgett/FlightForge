"use client";

import { useState } from "react";
import { ArrowRight, Eye, MapPin, ShieldCheck, SlidersHorizontal } from "lucide-react";
import type { AccountSettings } from "@/modules/auth/account-repository";
import { brand } from "@/config/brand";

type Props = {
  initial: AccountSettings;
  firstRun: boolean;
};

export function ProfileSetupForm({ initial, firstRun }: Props) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof AccountSettings>(key: K, value: AccountSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/account/onboarding", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          homeCity: form.homeCity || null,
          homeRegionCode: form.homeRegionCode || null,
          postalCode: form.postalCode || null,
          controlledDistanceFeet: form.controlledDistanceFeet || null,
        }),
      });
      const body = (await response.json()) as { error?: { message?: string }; next?: string };
      if (!response.ok) {
        setError(body.error?.message ?? "Your profile could not be saved.");
        return;
      }
      setSaved(true);
      if (firstRun) window.location.assign(body.next ?? "/profile");
    } catch {
      setError(`${brand.productName} could not reach the profile service.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="profile-setup" onSubmit={submit}>
      {form.isTestAccount ? (
        <div className="tester-account-warning">
          <ShieldCheck aria-hidden="true" />
          <div><strong>Privacy reminder</strong><p>Choose what other players can see. Precise home addresses are never shown on your public profile.</p></div>
        </div>
      ) : null}

      <section className="profile-section">
        <div className="profile-section-heading">
          <span className="section-number">01</span>
          <div><h2>Player basics</h2><p>Only display name is required. Everything else can change later.</p></div>
        </div>
        <div className="profile-field-grid">
          <label><span>Display name</span><input value={form.displayName} onChange={(event) => set("displayName", event.target.value)} minLength={2} maxLength={60} required /></label>
          <label><span>Email</span><input value={form.email} disabled aria-describedby="email-note" /></label>
          <label><span>Experience</span><select value={form.experienceLevel} onChange={(event) => set("experienceLevel", event.target.value as AccountSettings["experienceLevel"])}>
            <option value="NEW">Brand new</option><option value="BEGINNER">Beginner</option><option value="RECREATIONAL">Recreational</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option><option value="PROFESSIONAL">Professional</option>
          </select></label>
          <label><span>Throwing hand</span><select value={form.throwingHand} onChange={(event) => set("throwingHand", event.target.value as AccountSettings["throwingHand"])}>
            <option value="RIGHT">Right</option><option value="LEFT">Left</option><option value="AMBIDEXTROUS">Both</option><option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
          </select></label>
          <label><span>Controlled distance (ft) · optional</span><input type="number" min={50} max={1000} inputMode="numeric" value={form.controlledDistanceFeet ?? ""} onChange={(event) => set("controlledDistanceFeet", event.target.value ? Number(event.target.value) : null)} /></label>
          <label><span>How you play</span><select value={form.playStyle} onChange={(event) => set("playStyle", event.target.value as AccountSettings["playStyle"])}>
            <option value="CASUAL">Mostly casual</option><option value="COMPETITIVE">Mostly competitive</option><option value="BOTH">A mix of both</option>
          </select></label>
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section-heading">
          <span className="section-number">02</span>
          <div><h2><MapPin aria-hidden="true" /> Home area</h2><p>ZIP helps nearby search. Public views never expose it.</p></div>
        </div>
        <div className="profile-field-grid three-up">
          <label><span>City · optional</span><input value={form.homeCity ?? ""} onChange={(event) => set("homeCity", event.target.value || null)} maxLength={80} /></label>
          <label><span>State / region</span><input value={form.homeRegionCode ?? "ME"} onChange={(event) => set("homeRegionCode", event.target.value.toUpperCase() || null)} maxLength={3} /></label>
          <label><span>ZIP · private</span><input value={form.postalCode ?? ""} onChange={(event) => set("postalCode", event.target.value || null)} inputMode="numeric" autoComplete="postal-code" pattern="\d{5}(-\d{4})?" /></label>
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section-heading">
          <span className="section-number">03</span>
          <div><h2><SlidersHorizontal aria-hidden="true" /> Playing preferences</h2><p>These tune recommendations; they never exclude protected groups.</p></div>
        </div>
        <div className="preference-stack">
          <Toggle label="Social matchmaking" description="Let FlightForge suggest compatible public rounds." checked={form.socialMatchmaking} onChange={(value) => set("socialMatchmaking", value)} />
          <Toggle label="AI recommendations" description="Use your stated skill and bag for explainable shot suggestions." checked={form.aiRecommendations} onChange={(value) => set("aiRecommendations", value)} />
          <Toggle label="Tournament alerts" description="Show nearby registration and schedule notices." checked={form.tournamentNotifications} onChange={(value) => set("tournamentNotifications", value)} />
        </div>
      </section>

      <section className="profile-section privacy-section">
        <div className="profile-section-heading">
          <span className="section-number">04</span>
          <div><h2><Eye aria-hidden="true" /> Privacy controls</h2><p>Private is the default. Each switch is independent.</p></div>
        </div>
        <div className="profile-field-grid">
          <label><span>Profile visibility</span><select value={form.profileVisibility} onChange={(event) => set("profileVisibility", event.target.value as AccountSettings["profileVisibility"])}>
            <option value="PRIVATE">Only me</option><option value="CONNECTIONS">Connections</option><option value="PUBLIC">Public</option>
          </select></label>
          <label><span>Who may message</span><select value={form.allowMessages} onChange={(event) => set("allowMessages", event.target.value as AccountSettings["allowMessages"])}>
            <option value="NO_ONE">No one</option><option value="CONNECTIONS">Connections</option><option value="EVERYONE">Everyone</option>
          </select></label>
        </div>
        <div className="preference-stack">
          <Toggle label="Show home city" description="Never shows a street address or ZIP." checked={form.showHomeCity} onChange={(value) => set("showHomeCity", value)} />
          <Toggle label="Show round history" description="Make completed-round summaries visible at your selected profile level." checked={form.showRoundHistory} onChange={(value) => set("showRoundHistory", value)} />
          <Toggle label="Show digital bag" description="Share disc names, not purchase details." checked={form.showBag} onChange={(value) => set("showBag", value)} />
          <Toggle label="Allow game invitations" description="Blocked users can never invite you." checked={form.allowGameInvites} onChange={(value) => set("allowGameInvites", value)} />
          <Toggle label="Optional product analytics" description="Help improve nonessential product flows. Off by default." checked={form.analyticsOptIn} onChange={(value) => set("analyticsOptIn", value)} />
          <Toggle label="Allow AI training use" description="Off by default. This does not enable media uploads." checked={form.aiTrainingOptIn} onChange={(value) => set("aiTrainingOptIn", value)} />
        </div>
      </section>

      {error ? <div className="form-error" role="alert">{error}</div> : null}
      {saved ? <div className="form-success" role="status">Profile and privacy choices saved.</div> : null}
      <div className="profile-submit-bar">
        <p>{firstRun ? "You can revise every choice later." : "Changes apply to new profile views immediately."}</p>
        <button className="button button-primary" type="submit" disabled={submitting}>
          {submitting ? "Saving…" : firstRun ? "Save and enter FlightForge" : "Save changes"}
          {!submitting ? <ArrowRight aria-hidden="true" /> : null}
        </button>
      </div>
    </form>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span><strong>{label}</strong><small>{description}</small></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

