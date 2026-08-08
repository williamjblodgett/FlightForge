import type { Metadata } from "next";
import { publicContacts } from "@/config/public-launch";

export const metadata: Metadata = { title: "Privacy notice", robots: { index: true, follow: true } };

export default function PrivacyPage() {
  const contacts = publicContacts();
  return <main className="legal-page page-shell">
    <header><span className="eyebrow">Privacy notice · pre-launch draft</span><h1>How FlightForge handles information</h1><p>Effective August 8, 2026. This operational draft describes the current product. Qualified counsel must approve it before unrestricted public registration is enabled.</p></header>
    <section><h2>Information we process</h2><p>We process account and profile details, privacy choices, course favorites, rounds and scores, disc-bag entries, event participation, course claims and evidence, support submissions, audit events, and media you deliberately upload. Precise home addresses are not displayed in player profiles.</p></section>
    <section><h2>Why we use it</h2><p>We use information to authenticate accounts, provide requested features, protect users and courses, investigate reports, maintain reliable records, and improve opted-in product analytics. Private media is not used for model training unless the uploader explicitly opts in.</p></section>
    <section><h2>Media and location</h2><p>Coaching and highlight media is private or quarantined by default. Raw highlight uploads are not public; only sanitized and reviewed copies may be published. GPS is permission-based and presented as an estimate. Unnecessary embedded media location metadata is removed during configured sanitization.</p></section>
    <section><h2>Sharing and providers</h2><p>We use contracted infrastructure providers for hosting, storage, authentication, email, security processing, and—when enabled—AI analysis. Payment-card details must be handled by a secured payment provider and are not stored by FlightForge. We do not sell personal information.</p></section>
    <section><h2>Retention and your choices</h2><p>You may update profile visibility, delete eligible media, and request access, export, correction, or deletion. Security and transaction records may be retained where necessary for fraud prevention, disputes, or legal obligations. Expiring media remains subject to the configured deletion worker.</p></section>
    <section><h2>Children and safety</h2><p>Identifiable uploads involving minors require the designed guardian-consent flow. The public launch must establish age requirements and obtain legal approval before enabling minor accounts.</p></section>
    <section><h2>Contact</h2>{contacts.privacyEmail ? <p>Privacy requests: <a href={`mailto:${contacts.privacyEmail}`}>{contacts.privacyEmail}</a></p> : <p>Public registration remains paused until a monitored privacy address is configured.</p>}</section>
  </main>;
}
