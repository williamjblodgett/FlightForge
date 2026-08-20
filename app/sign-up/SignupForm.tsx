"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole, Shield } from "lucide-react";
import { brand } from "@/config/brand";

export function SignupForm({ returnTo = "/onboarding", registrationReady = true }: { returnTo?: string; registrationReady?: boolean }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(false);

  if (!registrationReady) {
    return (
      <section className="auth-card account-form" role="status">
        <LockKeyhole aria-hidden="true" />
        <span className="eyebrow">Registration paused</span>
        <h2>Already have a FlightForge account?</h2>
        <p>Sign in normally. New accounts are not accepted until the verification and support channels are ready.</p>
        <Link className="button button-primary button-wide" href={`/sign-in?return_to=${encodeURIComponent(returnTo)}`}>Sign in <ArrowRight size={18} aria-hidden="true" /></Link>
        <Link className="button button-secondary button-wide" href="/courses">Explore courses</Link>
      </section>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, email, password, acceptTerms, returnTo }),
      });
      const body = (await response.json()) as { error?: { message?: string }; next?: string };
      if (!response.ok) {
        setError(body.error?.message ?? "Your account could not be created.");
        return;
      }
      if (body.next && body.next !== "/verify-email") window.location.assign(body.next);
      else setCreated(true);
    } catch {
      setError(`${brand.productName} could not reach the account service.`);
    } finally {
      setSubmitting(false);
    }
  }

  if (created) return <section className="auth-card account-form" role="status"><Shield aria-hidden="true" /><span className="eyebrow">Check your inbox</span><h2>Verify your email to continue.</h2><p>We sent a single-use link that expires in 30 minutes. No session is created until that link is verified.</p><Link className="button button-secondary button-wide" href="/sign-in">Return to sign in</Link></section>;

  return (
    <div className="account-entry-grid signup-grid">
      <form className="auth-card account-form" onSubmit={submit}>
        <span className="eyebrow"><LockKeyhole aria-hidden="true" /> Create account</span>
        <h2>Your player name comes first</h2>

        <label className="field-label" htmlFor="signup-name">Display name</label>
        <input id="signup-name" autoComplete="nickname" value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={60} required />

        <label className="field-label" htmlFor="signup-email">Email</label>
        <input id="signup-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />

        <label className="field-label" htmlFor="signup-password">Password</label>
        <input id="signup-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={128} aria-describedby="password-help" required />
        <p id="password-help" className="field-help">At least 12 characters, including a letter and a number.</p>

        <label className="check-row">
          <input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} required />
          <span>I agree to the <Link href="/legal/terms">Terms</Link> and acknowledge the <Link href="/legal/privacy">Privacy Notice</Link>.</span>
        </label>

        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <button className="button button-primary button-wide" type="submit" disabled={submitting}>
          {submitting ? "Creating account…" : "Create free account"}
          {!submitting ? <ArrowRight size={18} aria-hidden="true" /> : null}
        </button>
        <p className="auth-switch">Already have an account? <Link href="/sign-in">Sign in</Link></p>
      </form>

      <aside className="privacy-promise">
        <Shield aria-hidden="true" />
        <span className="eyebrow">Privacy baseline</span>
        <h2>Closed profile. Your choice to open it.</h2>
        <ul>
          <li>Home location stays at city level in public views.</li>
          <li>Round history and your bag start hidden.</li>
          <li>AI training use starts off.</li>
          <li>No payment card is requested for a free account.</li>
        </ul>
      </aside>
    </div>
  );
}
