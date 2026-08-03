import type { Metadata } from "next";
import { chatGPTSignInPath } from "@/app/chatgpt-auth";
import { demoUsers } from "@/modules/auth/demo-users";
import { isDemoAuthEnabled } from "@/modules/auth/demo-session";
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
  const returnTo = safeReturnTo(query.return_to);
  return (
    <main className="auth-page page-shell">
      <div className="auth-heading">
        <span className="eyebrow">Your rounds, your courses, your community</span>
        <h1>Pick up where you left off.</h1>
        <p>Save a course, submit a verified claim, or manage the next great Maine round.</p>
      </div>
      <SignInForm
        demoEnabled={isDemoAuthEnabled()}
        users={demoUsers}
        returnTo={returnTo}
        hostedSignInPath={chatGPTSignInPath(returnTo)}
      />
    </main>
  );
}

function safeReturnTo(value: string | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
