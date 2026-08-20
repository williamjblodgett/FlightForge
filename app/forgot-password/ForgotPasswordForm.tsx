"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }),
      });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) setError(body.error?.message ?? "Recovery is temporarily unavailable.");
      else setSent(true);
    } catch { setError("Recovery is temporarily unavailable."); }
    finally { setBusy(false); }
  }

  if (sent) return <section className="auth-card account-form" role="status"><MailCheck aria-hidden="true" /><h2>Check your email</h2><p>If an account exists for that address, a secure recovery link is on its way.</p><Link className="button button-secondary button-wide" href="/sign-in">Return to sign in</Link></section>;
  return <form className="auth-card account-form" onSubmit={submit}><MailCheck aria-hidden="true" /><h2>Reset your password</h2><p>We will send a single-use recovery link without revealing whether an account exists.</p><label className="field-label" htmlFor="recovery-email">Email</label><input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />{error ? <div className="form-error" role="alert">{error}</div> : null}<button className="button button-primary button-wide" disabled={busy}>{busy ? "Sending…" : "Send recovery link"}</button></form>;
}
