"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";

export function HostedAccountLinkForm({ email,returnTo="/profile" }: { email: string;returnTo?:string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
    const response = await fetch("/api/account/link-hosted", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password,returnTo }) });
    const body = await response.json() as { next?: string; error?: { message?: string } };
    if (response.ok) window.location.assign(body.next ?? "/profile");
    else { setError(body.error?.message ?? "The accounts could not be linked."); setBusy(false); }
    }catch{setError("The connection failed. Your password was not cleared; retry securely.");}finally{setBusy(false);}
  }
  return <form className="auth-card account-form" onSubmit={submit}><Link2 aria-hidden="true" /><h2>Link {email}</h2><p>Enter the password for the existing FlightForge account. This proves control without trusting an unverified email match.</p><label className="field-label" htmlFor="link-password">Existing password</label><input id="link-password" type="password" autoComplete="current-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required />{error ? <div className="form-error" role="alert">{error}</div> : null}<button className="button button-primary button-wide" disabled={busy}>{busy ? "Linking securely…" : "Confirm and link identity"}</button></form>;
}
