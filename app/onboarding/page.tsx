import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { ProfileSetupForm } from "@/components/profile/ProfileSetupForm";
import { getCurrentUser } from "@/modules/auth/current-user";
import { getAccountSettings } from "@/modules/auth/account-repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Set up your player profile", robots: { index: false, follow: false } };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?return_to=/onboarding");
  if (user.mustChangePassword) redirect("/account/password");
  const settings = await getAccountSettings(user);
  return (
    <main className="profile-page page-shell">
      <header className="profile-page-header">
        <span className="eyebrow">First tee · about 2 minutes</span>
        <h1>Set your game. Set your boundaries.</h1>
        <p>Useful recommendations need context. Community features need consent. You control both.</p>
      </header>
      <ProfileSetupForm initial={settings} firstRun />
      <div className="auth-session-exit">
        <p>Want to finish this later? Your account is already saved.</p>
        <SignOutButton source={user.source} variant="standalone" />
      </div>
    </main>
  );
}
