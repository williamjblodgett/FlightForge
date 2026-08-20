import type { Metadata } from "next";
import { SignupForm } from "./SignupForm";
import { safeRelativeReturnPath } from "@/lib/http/safe-return-path";
import { isPublicRegistrationReady } from "@/config/public-launch";

export const metadata: Metadata = {
  title: "Create a free account",
  robots: { index: false, follow: false },
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const query = await searchParams;
  const returnTo = safeRelativeReturnPath(query.return_to || "/onboarding");
  const registrationReady = isPublicRegistrationReady();
  return (
    <main className="auth-page page-shell">
      <div className="auth-heading">
        <span className="eyebrow">Player accounts</span>
        <h1>{registrationReady ? "Make the course yours." : "New account registration is temporarily unavailable."}</h1>
        <p>{registrationReady ? "Create the account now; tune skill details, social preferences, and privacy on the next screen." : "Existing players can still sign in. Registration will reopen when verified account-support and email-delivery channels are active."}</p>
      </div>
      <SignupForm returnTo={returnTo} registrationReady={registrationReady} />
    </main>
  );
}

