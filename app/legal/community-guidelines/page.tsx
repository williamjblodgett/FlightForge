import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/config/brand";
import { publicContacts } from "@/config/public-launch";

export const metadata: Metadata = {
  title: "Community guidelines",
  description: `Rules for respectful, safe participation in the ${brand.productName} community.`,
};

export default function CommunityGuidelinesPage() {
  const contacts = publicContacts();
  return <main className="legal-page page-shell">
    <header>
      <span className="eyebrow">Community guidelines</span>
      <h1>Compete hard. Treat people well.</h1>
      <p>Effective August 20, 2026. Community messaging is currently for adults 18 and older. The age check is a self-attestation, not identity-based age verification.</p>
    </header>
    <section><h2>Keep the clubhouse welcoming</h2><p>Talk about disc golf, coordinate play, and disagree without attacking people. Harassment, threats, stalking, hateful conduct, sexual exploitation, or discrimination based on a protected characteristic are not allowed.</p></section>
    <section><h2>Protect personal boundaries</h2><p>Do not publish another person’s private contact details, precise home location, credentials, or sensitive identifiers. Respect message preferences, blocks, event rules, and a player’s decision not to meet or continue a conversation.</p></section>
    <section><h2>Share honestly</h2><p>Do not impersonate another person or organization, misrepresent course or event authority, coordinate score manipulation, distribute scams, or post repetitive promotions. Only share media you have the right and participant consent to publish.</p></section>
    <section><h2>Use the safety controls</h2><p>Block immediately when you do not want contact. Report messages, conversations, or accounts that may violate these rules. FlightForge is not an emergency service; contact local emergency services when someone may be in immediate danger.</p></section>
    <section><h2>How moderation works</h2><p>Automated checks may temporarily quarantine limited high-risk text. Authorized moderators may review reports, remove content, warn, mute, suspend, or ban an account. Significant actions require a reason and create an audit record. Reporting does not guarantee a particular outcome.</p></section>
    <section><h2>Questions</h2><p>Read the <Link href="/legal/terms">Terms</Link> and <Link href="/legal/privacy">Privacy notice</Link>. {contacts.supportEmail ? <>Questions may be sent to <a href={`mailto:${contacts.supportEmail}`}>{contacts.supportEmail}</a>.</> : <>Direct account registration remains unavailable until a verified support channel is configured.</>}</p></section>
  </main>;
}
