import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { publicContacts } from "@/config/public-launch";

export const metadata: Metadata = { title: "Terms of service", robots: { index: true, follow: true } };

export default function TermsPage() {
  const contacts = publicContacts();
  return <main className="legal-page page-shell">
    <header><span className="eyebrow">Terms of service</span><h1>Terms for using {brand.productName}</h1><p>Effective August 8, 2026. These terms describe the rules for using FlightForge and its available services.</p></header>
    <section><h2>Accounts</h2><p>Provide accurate information, keep your credentials private, and notify support about suspected unauthorized access. You are responsible for activity performed through your account.</p></section>
    <section><h2>Course and event information</h2><p>Course schedules, conditions, fees, and event details can change. Confirm closures, restrictions, costs, and safety conditions with the course or organizer before traveling or participating.</p></section>
    <section><h2>User content</h2><p>You retain ownership of content you submit and grant the limited rights needed to store, process, moderate, and display it according to your settings. Only upload content you are authorized to share. We may quarantine or remove unsafe, unlawful, infringing, or misleading material.</p></section>
    <section><h2>AI and range estimates</h2><p>AI coaching, caddie suggestions, pose landmarks, GPS distances, and camera estimates can be incomplete or wrong. They are optional training aids—not medical, emergency, legal, or professional advice. Stop an activity that causes pain and consult a qualified professional where appropriate.</p></section>
    <section><h2>Acceptable use</h2><p>Do not harass others, discriminate using protected characteristics, evade access controls, upload malware, falsify ownership, manipulate scores or reviews, scrape restricted content, or interfere with the service.</p></section>
    <section><h2>Outdoor activity and service availability</h2><p>Disc golf and other outdoor activities involve natural terrain, weather, other participants, and additional hazards. Use your judgment, follow posted rules, and do not rely on FlightForge for emergency services. Features may change, be interrupted, or be withdrawn.</p></section>
    <section><h2>Contact</h2>{contacts.supportEmail ? <p>Terms questions: <a href={`mailto:${contacts.supportEmail}`}>{contacts.supportEmail}</a></p> : <p>Use the support and course-correction links in FlightForge to contact the team.</p>}</section>
  </main>;
}
