import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PasswordSetupForm } from "@/components/auth/PasswordSetupForm";
import { getCurrentUser } from "@/modules/auth/current-user";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Secure your account", robots: { index: false, follow: false } };

export default async function PasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?return_to=/account/password");
  if (user.source !== "password") redirect(user.onboardingComplete ? "/profile" : "/onboarding");
  return (
    <main className="auth-page page-shell">
      <div className="auth-heading">
        <span className="eyebrow">Player access · private by default</span>
        <h1>Secure your player pass.</h1>
        <p>{user.mustChangePassword ? "The starter password is temporary. Replace it before setting up your player profile." : "Change your password and close every other active account session."}</p>
      </div>
      <PasswordSetupForm temporary={user.mustChangePassword} />
    </main>
  );
}
