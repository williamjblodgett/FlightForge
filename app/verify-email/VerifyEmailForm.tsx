"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";

export function VerifyEmailForm({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function verify() {
    setBusy(true); setMessage("");
    const response = await fetch("/api/auth/verify-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
    const body = await response.json() as { next?: string; error?: { message?: string } };
    if (response.ok) window.location.assign(body.next ?? "/onboarding");
    else { setMessage(body.error?.message ?? "The verification link could not be used."); setBusy(false); }
  }
  return <section className="auth-card account-form"><ShieldCheck aria-hidden="true" /><h2>Confirm account ownership</h2><p>Continue only if you requested this FlightForge account.</p>{message ? <div className="form-error" role="alert">{message}</div> : null}<button className="button button-primary button-wide" disabled={busy || !token} onClick={verify}>{busy ? "Verifying…" : "Verify email and continue"}</button></section>;
}
