import type { Metadata } from "next";
import { UpdatePasswordForm } from "./UpdatePasswordForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };
export default function UpdatePasswordPage() {
  return <main className="auth-page page-shell"><div className="auth-heading"><span className="eyebrow">Account recovery</span><h1>Secure your account.</h1><p>Use a password you do not reuse on another service.</p></div><UpdatePasswordForm /></main>;
}
