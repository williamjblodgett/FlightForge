import type { Metadata } from "next";
import { chatGPTSignInPath } from "@/app/chatgpt-auth";
import { safeRelativeReturnPath } from "@/lib/http/safe-return-path";
import { SignInForm } from "./SignInForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ return_to?: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const query = await searchParams;
  const returnTo = safeRelativeReturnPath(query.return_to);
  return (
    <main className="auth-page page-shell">
      <div className="auth-heading">
        <span className="eyebrow">Player field book · private by default</span>
        <h1>Pick up at the next tee.</h1>
        <p>Save courses, carry your preferences, and decide exactly what other players can see.</p>
      </div>
      <SignInForm
        returnTo={returnTo}
        hostedSignInPath={chatGPTSignInPath(returnTo)}
      />
    </main>
  );
}
