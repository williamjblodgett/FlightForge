"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import { brand } from "@/config/brand";

type Props = {
  returnTo: string;
  initialError?: string | null;
};

export function SignInForm({ returnTo, initialError = null }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await response.json()) as {
        error?: { message?: string };
        next?: string;
        user?: { onboardingComplete?: boolean; mustChangePassword?: boolean };
      };
      if (!response.ok) {
        setError(body.error?.message ?? "Sign-in failed. Try again.");
        return;
      }
      const destination = body.user?.mustChangePassword
        ? body.next ?? "/account/password"
        : body.user?.onboardingComplete && returnTo !== "/"
          ? returnTo
          : body.next ?? returnTo;
      window.location.assign(destination);
    } catch {
      setError(`${brand.productName} could not reach the sign-in service.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="account-entry-grid">
      <form className="auth-card account-form" onSubmit={submit} aria-busy={submitting}>
        <span className="eyebrow"><KeyRound aria-hidden="true" /> Player access</span>
        <h2>Sign in to your FlightForge account</h2>
        <p className="field-help">Use your email and FlightForge password. No third-party account is required.</p>

        <label className="field-label" htmlFor="account-email">Email</label>
        <input
          id="account-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "sign-in-error" : undefined}
          required
        />

        <label className="field-label" htmlFor="account-password">Password</label>
        <input
          id="account-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "sign-in-error" : undefined}
          required
        />

        {error ? <div id="sign-in-error" className="form-error" role="alert">{error}</div> : null}
        <button className="button button-primary button-wide" type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
          {!submitting ? <ArrowRight size={18} aria-hidden="true" /> : null}
        </button>
        <p className="auth-switch"><Link href={`/forgot-password?return_to=${encodeURIComponent(returnTo)}`}>Forgot your password?</Link></p>
        <p className="auth-switch">New here? <Link href={`/sign-up?return_to=${encodeURIComponent(returnTo)}`}>Create a free account</Link></p>
      </form>

    </div>
  );
}
