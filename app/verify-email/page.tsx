import { authReturnPath } from "@/modules/auth/continuation";
import type { Metadata } from "next";
import { VerifyEmailForm } from "./VerifyEmailForm";

export const metadata: Metadata = { title: "Verify email", robots: { index: false, follow: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string;return_to?:string }> }) {
  const { token = "",return_to } = await searchParams;
  return <main className="auth-page page-shell"><div className="auth-heading"><span className="eyebrow">Account security</span><h1>Verify your email.</h1><p>Verification links expire after 30 minutes and can be used only once.</p></div><VerifyEmailForm returnTo={authReturnPath(return_to)} token={token} /></main>;
}
