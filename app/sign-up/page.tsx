import type { Metadata } from "next";
import { SignupForm } from "./SignupForm";
import { safeRelativeReturnPath } from "@/lib/http/safe-return-path";
import { isRegistrationReady } from "@/modules/auth/registration-readiness";
import {isGoogleSignInEnabled} from "@/modules/auth/google-config";
import {getAuthProviderHealth} from "@/lib/supabase/health";
export const dynamic="force-dynamic";

export const metadata: Metadata = {
  title: "Create a free account",
  robots: { index: false, follow: false },
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const query = await searchParams;
  const returnTo = safeRelativeReturnPath(query.return_to || "/onboarding");
  const authentication = await getAuthProviderHealth();
  const registrationReady = isRegistrationReady() && authentication.status!=="UNAVAILABLE";
  return (
    <main className="auth-page page-shell">
      <div className="auth-heading">
        <span className="eyebrow">Player accounts</span>
        <h1>{registrationReady ? "Make the course yours." : "New account registration is temporarily unavailable."}</h1>
        <p>{registrationReady ? "Create the account now; tune skill details, social preferences, and privacy on the next screen." : "We’re restoring account services. Please try again later. Some existing accounts may still be able to sign in."}</p>
      </div>
      <SignupForm returnTo={returnTo} registrationReady={registrationReady} googleEnabled={isGoogleSignInEnabled()} />
    </main>
  );
}

