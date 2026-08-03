import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy placeholder", robots: { index: false, follow: false } };

export default function PrivacyPage() {
  return (
    <main className="legal-page page-shell">
      <header><span className="eyebrow">Attorney review required</span><h1>Privacy policy placeholder</h1><p>Last updated August 3, 2026 · This page is a product-design placeholder and is not a claim of legal compliance.</p></header>
      <section><h2>Data categories represented in this build</h2><p>Account identity, role assignments, saved courses, claim applications, private claim evidence, audit events, source attribution, and coarse course coordinates.</p></section>
      <section><h2>Current controls</h2><p>Private evidence uses authenticated access, server-side authorization, file signature validation, size limits, and non-public object storage. Demo sessions are explicitly gated and disabled in production by default.</p></section>
      <section><h2>Review before launch</h2><p>Marketplace payments, precise location, media analysis, minor users, biometric or body-motion laws, user-generated content, state privacy laws, international transfers, retention, deletion, and data-export language all require qualified counsel.</p></section>
      <section><h2>Contact placeholder</h2><p>Privacy questions: privacy@flightforge.example</p></section>
    </main>
  );
}
