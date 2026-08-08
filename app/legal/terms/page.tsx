import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { publicContacts } from "@/config/public-launch";

export const metadata: Metadata = { title: "Terms of service", robots: { index: true, follow: true } };

export default function TermsPage() {
  const contacts = publicContacts();
  return <main className="legal-page page-shell">
    <header><span className="eyebrow">Terms · pre-launch draft</span><h1>Terms for using {brand.productName}</h1><p>Effective August 8, 2026. Qualified counsel must approve these terms before unrestricted public registration or payments are enabled.</p></header>
    <section><h2>Accounts</h2><p>Provide accurate information, keep credentials private, and notify support about suspected unauthorized access. Do not share temporary tester credentials or place sensitive personal data in a test account.</p></section>
    <section><h2>Course and event information</h2><p>Directory evidence and course-reported conditions can become outdated and do not guarantee same-day access. Confirm closures, restrictions, fees, and safety conditions with the operator. Fictional demonstrations are labeled and cannot accept real registration or payment.</p></section>
    <section><h2>User content</h2><p>You retain ownership of content you submit and grant the limited rights needed to store, process, moderate, and display it according to your settings. Only upload content you are authorized to share. We may quarantine or remove unsafe, unlawful, infringing, or misleading material.</p></section>
    <section><h2>AI and range estimates</h2><p>AI coaching, caddie suggestions, pose landmarks, GPS distances, and camera estimates can be incomplete or wrong. They are optional training aids—not medical, emergency, legal, or professional advice. Stop an activity that causes pain and consult a qualified professional where appropriate.</p></section>
    <section><h2>Acceptable use</h2><p>Do not harass others, discriminate using protected characteristics, evade access controls, upload malware, falsify ownership, manipulate scores or reviews, scrape restricted content, or interfere with the service.</p></section>
    <section><h2>Availability and liability review</h2><p>Outdoor recreation involves hazards. Service availability, marketplace terms, waivers, limitations of liability, dispute terms, governing law, and jurisdiction-specific consumer rights require final legal language before production launch.</p></section>
    <section><h2>Contact</h2>{contacts.supportEmail ? <p>Terms questions: <a href={`mailto:${contacts.supportEmail}`}>{contacts.supportEmail}</a></p> : <p>Public registration remains paused until a monitored support address is configured.</p>}</section>
  </main>;
}
