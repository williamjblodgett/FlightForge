"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/update-password", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ password, confirmation }) });
      const body = await response.json() as { next?: string; error?: { message?: string } };
      if (response.ok) window.location.assign(body.next ?? "/profile");
      else setError(body.error?.message ?? "The password could not be updated.");
    } catch { setError("The password could not be updated."); }
    finally { setBusy(false); }
  }
  return <form className="auth-card account-form" onSubmit={submit}><KeyRound aria-hidden="true" /><h2>Choose a new password</h2><label className="field-label" htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} /><p className="field-help">At least 12 characters, including a letter and a number.</p><label className="field-label" htmlFor="confirm-password">Confirm password</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />{error ? <div className="form-error" role="alert">{error}</div> : null}<button className="button button-primary button-wide" disabled={busy}>{busy ? "Updating…" : "Update password"}</button></form>;
}
