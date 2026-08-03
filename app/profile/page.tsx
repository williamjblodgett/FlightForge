import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileSetupForm } from "@/components/profile/ProfileSetupForm";
import { getCurrentUser } from "@/modules/auth/current-user";
import { getAccountSettings } from "@/modules/auth/account-repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Player profile and privacy", robots: { index: false, follow: false } };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?return_to=/profile");
  if (user.mustChangePassword) redirect("/account/password");
  const settings = await getAccountSettings(user);
  return (
    <main className="profile-page page-shell">
      <header className="profile-page-header">
        <span className="eyebrow">Player field book</span>
        <h1>{settings.displayName}</h1>
        <p>Update playing context and privacy without exposing your precise home location.</p>
      </header>
      <ProfileSetupForm initial={settings} firstRun={false} />
    </main>
  );
}
