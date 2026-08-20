import type { Metadata } from "next";
import { SignupForm } from "./SignupForm";
import { safeRelativeReturnPath } from "@/lib/http/safe-return-path";

export const metadata: Metadata = {
  title: "Create a free account",
  robots: { index: false, follow: false },
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const query = await searchParams;
  const returnTo = safeRelativeReturnPath(query.return_to || "/onboarding");
  return (
    <main className="auth-page page-shell">
      <div className="auth-heading">
        <span className="eyebrow">Free player account · no card required</span>
        <h1>Make the course yours.</h1>
        <p>Create the account now; tune skill details, social preferences, and privacy on the next screen.</p>
      </div>
      <SignupForm returnTo={returnTo} />
    </main>
  );
}

