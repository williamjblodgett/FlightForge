import type { Metadata } from "next";
import { VerifyEmailForm } from "./VerifyEmailForm";

export const metadata: Metadata = { title: "Verify email", robots: { index: false, follow: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <main className="auth-page page-shell"><div className="auth-heading"><span className="eyebrow">Account security</span><h1>Verify your email.</h1><p>Verification links expire after 30 minutes and can be used only once.</p></div><VerifyEmailForm token={token} /></main>;
}
