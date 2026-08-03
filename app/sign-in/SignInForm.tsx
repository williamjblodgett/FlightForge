"use client";

import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import type { DemoUser } from "@/modules/auth/demo-users";

type Props = {
  demoEnabled: boolean;
  users: DemoUser[];
  returnTo: string;
  hostedSignInPath: string;
};

export function SignInForm({ demoEnabled, users, returnTo, hostedSignInPath }: Props) {
  const [email, setEmail] = useState(users[0]?.email ?? "");
  const [password, setPassword] = useState(users[0]?.password ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string } };
        setError(body.error?.message ?? "Sign-in failed. Try again.");
        return;
      }
      window.location.assign(returnTo);
    } catch {
      setError("FlightForge could not reach the sign-in service.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!demoEnabled) {
    return (
      <div className="auth-card">
        <div className="auth-icon"><ShieldCheck aria-hidden="true" /></div>
        <h2>Continue securely</h2>
        <p>Sign in through the hosted identity service to save courses and manage claims.</p>
        <a className="button button-primary button-wide" href={hostedSignInPath}>
          Sign in with ChatGPT <ArrowRight size={18} aria-hidden="true" />
        </a>
      </div>
    );
  }

  return (
    <div className="auth-grid">
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">Local demonstration</span>
        <h2>Choose a FlightForge role</h2>
        <p>These accounts contain fictional data and are disabled in production by default.</p>

        <label className="field-label" htmlFor="demo-user">Demo account</label>
        <select
          id="demo-user"
          value={email}
          onChange={(event) => {
            const user = users.find((candidate) => candidate.email === event.target.value);
            setEmail(event.target.value);
            if (user) setPassword(user.password);
          }}
        >
          {users.map((user) => (
            <option key={user.id} value={user.email}>
              {user.label} — {user.displayName}
            </option>
          ))}
        </select>

        <label className="field-label" htmlFor="demo-password">Password</label>
        <input
          id="demo-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <button className="button button-primary button-wide" type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Enter FlightForge"}
          {!submitting ? <ArrowRight size={18} aria-hidden="true" /> : null}
        </button>
      </form>

      <aside className="auth-note">
        <ShieldCheck size={22} aria-hidden="true" />
        <div>
          <strong>Production identity stays separate.</strong>
          <p>Hosted sessions use server-provided identity headers. Demo cookies are signed, HTTP-only, short-lived, and available only when explicitly enabled.</p>
        </div>
      </aside>
    </div>
  );
}
