import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { ProfileSetupForm } from "@/components/profile/ProfileSetupForm";
import { getCurrentUser } from "@/modules/auth/current-user";
import { getAccountSettings } from "@/modules/auth/account-repository";
import Link from "next/link";
import { Backpack, Camera, Flag, Heart, MessageCircle, Users } from "lucide-react";

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
      <nav className="profile-tool-hub" aria-label="Player tools">
        <Link href="/bag"><Backpack aria-hidden="true" /><span><strong>Disc bag</strong><small>Equipment for your caddie</small></span></Link>
        <Link href="/coach"><Camera aria-hidden="true" /><span><strong>Camera coach</strong><small>Record and review form</small></span></Link>
        <Link href="/play"><Flag aria-hidden="true" /><span><strong>Live round</strong><small>Score offline</small></span></Link>
        <Link href="/favorites"><Heart aria-hidden="true" /><span><strong>Saved courses</strong><small>Your field list</small></span></Link>
        <Link href="/messages"><MessageCircle aria-hidden="true" /><span><strong>Messages</strong><small>Your player conversations</small></span></Link>
        <Link href="/community"><Users aria-hidden="true" /><span><strong>Community</strong><small>Players and clubhouses</small></span></Link>
      </nav>
      <ProfileSetupForm initial={settings} firstRun={false} />
      <section className="account-actions-panel" aria-labelledby="account-actions-heading">
        <div>
          <span className="eyebrow">Account session</span>
          <h2 id="account-actions-heading">Finished for now?</h2>
          <p>Sign out on shared devices. Your saved profile and privacy choices remain in your account.</p>
        </div>
        <SignOutButton source={user.source} variant="standalone" />
      </section>
    </main>
  );
}
