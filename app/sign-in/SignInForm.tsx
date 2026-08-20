"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { brand } from "@/config/brand";

type Props = {
  returnTo: string;
  hostedSignInPath: string;
};

export function SignInForm({ returnTo, hostedSignInPath }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
      <form className="auth-card account-form" onSubmit={submit}>
        <span className="eyebrow"><KeyRound aria-hidden="true" /> Player access</span>
        <h2>Sign in to your field book</h2>

        <label className="field-label" htmlFor="account-email">Email</label>
        <input
          id="account-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label className="field-label" htmlFor="account-password">Password</label>
        <input
          id="account-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <button className="button button-primary button-wide" type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
          {!submitting ? <ArrowRight size={18} aria-hidden="true" /> : null}
        </button>
        <p className="auth-switch"><Link href="/forgot-password">Forgot your password?</Link></p>
        <p className="auth-switch">New here? <Link href={`/sign-up?return_to=${encodeURIComponent(returnTo)}`}>Create a free account</Link></p>
        <div className="hosted-auth-divider"><span>or</span></div>
        <a className="button button-secondary button-wide" href={hostedSignInPath}>
          <ShieldCheck size={18} aria-hidden="true" /> Continue with hosted identity
        </a>
      </form>

    </div>
  );
}
