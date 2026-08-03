import type { Metadata } from "next";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = {
  title: "Create a free account",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <main className="auth-page page-shell">
      <div className="auth-heading">
        <span className="eyebrow">Free player account · no card required</span>
        <h1>Make the course yours.</h1>
        <p>Create the account now; tune skill details, social preferences, and privacy on the next screen.</p>
      </div>
      <SignupForm />
    </main>
  );
}

