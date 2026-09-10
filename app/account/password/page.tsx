import { authReturnPath,authStepPath,nextAuthDestination } from "@/modules/auth/continuation";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { PasswordSetupForm } from "@/components/auth/PasswordSetupForm";
import { getCurrentUser } from "@/modules/auth/current-user";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Secure your account", robots: { index: false, follow: false } };

export default async function PasswordPage({searchParams}:{searchParams:Promise<{return_to?:string}>}) {
  const returnTo=authReturnPath((await searchParams).return_to);
  const user = await getCurrentUser();
  if (!user) redirect(authStepPath("/sign-in",returnTo));
  if (user.source !== "password") redirect(nextAuthDestination({...user,mustChangePassword:false},returnTo));
  return (
    <main className="auth-page page-shell">
      <div className="auth-heading">
        <span className="eyebrow">Player access · private by default</span>
        <h1>Secure your player pass.</h1>
        <p>{user.mustChangePassword ? "The starter password is temporary. Replace it before setting up your player profile." : "Change your password and close every other active account session."}</p>
      </div>
      <PasswordSetupForm returnTo={returnTo} temporary={user.mustChangePassword} />
      <div className="auth-session-exit">
        <p>Not your account or using a shared device?</p>
        <SignOutButton variant="standalone" />
      </div>
    </main>
  );
}
