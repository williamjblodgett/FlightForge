import type { Metadata } from "next";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Terms of service", robots: { index: false, follow: true } };

export default function TermsPage() {
  return (
    <main className="legal-page page-shell">
      <span className="eyebrow">Draft for attorney review</span>
      <h1>Terms of service placeholder</h1>
      <p>This working draft explains the product intent for {brand.productName}; it is not a representation that legal review or jurisdiction-specific compliance is complete.</p>
      <h2>Account basics</h2>
      <p>Use accurate account information, protect your credentials, respect other players, and do not use shared tester accounts for personal or sensitive data.</p>
      <h2>Course information</h2>
      <p>Directory availability is evidence, not a guarantee. Confirm current conditions, access restrictions, fees, and hours with the operator before travel.</p>
      <h2>Safety and AI</h2>
      <p>Outdoor play carries risk. AI suggestions are optional estimates, not medical, emergency, legal, or professional instruction.</p>
      <h2>Review required</h2>
      <p>Marketplace payments, location data, minors, media analysis, waivers, liability, privacy law, and international use require qualified counsel before their production launch.</p>
    </main>
  );
}
