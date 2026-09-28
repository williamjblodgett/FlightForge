"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import {useClientReady} from "@/components/player-tools/ReadyControls";

export function ForgotPasswordForm({ returnTo = "/" }: { returnTo?: string }) {
  const ready=useClientReady();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, returnTo }),
      });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) setError(body.error?.message ?? "Recovery is temporarily unavailable.");
      else setSent(true);
    } catch { setError("Recovery is temporarily unavailable."); }
    finally { setBusy(false); }
  }

  if (sent) return <section className="auth-card account-form" role="status"><MailCheck aria-hidden="true" /><h2>Check your email</h2><p>If this address is eligible, check your inbox for a recovery link. Recent requests may be delayed.</p><Link className="button button-secondary button-wide" href={`/sign-in?return_to=${encodeURIComponent(returnTo)}`}>Return to sign in</Link></section>;
  return <form className="auth-card account-form" onSubmit={submit}><MailCheck aria-hidden="true" /><h2>Reset your password</h2><p>Request a single-use recovery link.</p><label className="field-label" htmlFor="recovery-email">Email</label><input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />{error ? <div className="form-error" role="alert">{error}</div> : null}<button className="button button-primary button-wide" disabled={!ready||busy}>{busy ? "Sending…" : "Send recovery link"}</button></form>;
}
