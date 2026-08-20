"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { communityRequest } from "./api";
import styles from "./Community.module.css";

type Props = {
  policyVersion: string;
  onComplete: () => void;
};

export function AdultCommunityGate({ policyVersion, onComplete }: Props) {
  const [isAdult, setIsAdult] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdult || !guidelinesAccepted || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await communityRequest("/api/community/attestation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isAdult: true, guidelinesAccepted: true, policyVersion }),
      });
      onComplete();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your community access could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.adultGate} aria-labelledby="community-access-title">
      <div className={styles.gateSeal}><ShieldCheck aria-hidden="true" /></div>
      <div className={styles.gateCopy}>
        <span>Community access</span>
        <h2 id="community-access-title">A player space built for adults</h2>
        <p>FlightForge community features are currently available to people 18 and older. This is a self-attestation, not identity or age verification.</p>
      </div>
      <form className={styles.gateForm} onSubmit={submit}>
        <label><input type="checkbox" checked={isAdult} onChange={(event) => setIsAdult(event.target.checked)} /><span>I confirm that I am at least 18 years old.</span></label>
        <label><input type="checkbox" checked={guidelinesAccepted} onChange={(event) => setGuidelinesAccepted(event.target.checked)} /><span>I agree to the <Link href="/legal/community-guidelines" target="_blank">community guidelines</Link> and understand that reported messages may be reviewed.</span></label>
        {error ? <p className={styles.formError} role="alert">{error}</p> : null}
        <button className={styles.primaryButton} type="submit" disabled={!isAdult || !guidelinesAccepted || submitting}>
          {submitting ? "Saving…" : "Enter the community"}<ArrowRight aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}
