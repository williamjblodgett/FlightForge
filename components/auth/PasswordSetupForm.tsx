"use client";

import { useState } from "react";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { brand } from "@/config/brand";

type Props = { temporary: boolean };

export function PasswordSetupForm({ temporary }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/account/password", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmation }),
      });
      const body = (await response.json()) as { error?: { message?: string }; next?: string };
      if (!response.ok) {
        setError(body.error?.message ?? "Your password could not be changed.");
        return;
      }
      window.location.assign(body.next ?? "/onboarding");
    } catch {
      setError(`${brand.productName} could not reach the account service.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="account-entry-grid password-entry-grid">
      <form className="auth-card account-form" onSubmit={submit}>
        <span className="eyebrow"><KeyRound aria-hidden="true" /> {temporary ? "First-login security" : "Account security"}</span>
        <h2>{temporary ? "Replace the temporary password" : "Choose a new password"}</h2>
        <p className="field-help">Use a password unique to {brand.productName}. All other signed-in sessions will be closed.</p>

        <label className="field-label" htmlFor="current-password">Current password</label>
        <input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />

        <label className="field-label" htmlFor="new-password">New private password</label>
        <input id="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} aria-describedby="new-password-help" required />
        <p id="new-password-help" className="field-help">At least 12 characters, including a letter and a number.</p>

        <label className="field-label" htmlFor="confirm-password">Confirm new password</label>
        <input id="confirm-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />

        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <button className="button button-primary button-wide" type="submit" disabled={submitting}>
          {submitting ? "Securing account…" : "Save private password"}
          {!submitting ? <ArrowRight aria-hidden="true" /> : null}
        </button>
      </form>
      <aside className="privacy-promise password-promise">
        <ShieldCheck aria-hidden="true" />
        <span className="eyebrow">What happens next</span>
        <h2>The shared password stops working.</h2>
        <ul><li>Your replacement is salted and hashed before storage.</li><li>Existing sessions are revoked.</li><li>Only the player role is assigned.</li><li>Profile and privacy setup follows next.</li></ul>
      </aside>
    </div>
  );
}
