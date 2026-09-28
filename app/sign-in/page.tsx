import type { Metadata } from "next";
import { safeRelativeReturnPath } from "@/lib/http/safe-return-path";
import { SignInForm } from "./SignInForm";
import {isGoogleSignInEnabled} from "@/modules/auth/google-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ return_to?: string; error?: string }>;
};

const confirmationErrors: Record<string, string> = {
  auth_unavailable: "Account confirmation is temporarily unavailable. Please try again.",
  invalid_confirmation: "That confirmation link is invalid or has expired. Request a new link and try again.",
  google_unavailable: "Google sign-in is not available right now. You can still use your email and password.",
  google_cancelled: "Google sign-in was cancelled. Try again whenever you’re ready.",
  google_failed: "Google sign-in could not be completed. Start again from this page.",
};

export default async function SignInPage({ searchParams }: Props) {
  const query = await searchParams;
  const returnTo = safeRelativeReturnPath(query.return_to);
  const initialError = query.error ? confirmationErrors[query.error] ?? "Sign-in could not be completed. Please try again." : null;
  return (
    <main className="auth-page page-shell">
      <div className="auth-heading">
        <span className="eyebrow">Player field book · private by default</span>
        <h1>Pick up at the next tee.</h1>
        <p>Save courses, carry your preferences, and decide exactly what other players can see.</p>
      </div>
      <SignInForm returnTo={returnTo} initialError={initialError} googleEnabled={isGoogleSignInEnabled()} />
    </main>
  );
}
