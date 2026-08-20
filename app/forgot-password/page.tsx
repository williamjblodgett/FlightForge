import type { Metadata } from "next";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };
export default function ForgotPasswordPage() {
  return <main className="auth-page page-shell"><div className="auth-heading"><span className="eyebrow">Secure account recovery</span><h1>Get back to your field book.</h1><p>Recovery links expire and can be used only once.</p></div><ForgotPasswordForm /></main>;
}
