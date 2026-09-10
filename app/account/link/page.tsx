import { authReturnPath,authStepPath,nextAuthDestination } from "@/modules/auth/continuation";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/current-user";
import { HostedAccountLinkForm } from "./HostedAccountLinkForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Link verified sign-in", robots: { index: false, follow: false } };

export default async function AccountLinkPage({searchParams}:{searchParams:Promise<{return_to?:string}>}) {
  const returnTo=authReturnPath((await searchParams).return_to);
  const user = await getCurrentUser();
  if (!user) redirect(authStepPath("/sign-in",returnTo));
  if (!user.identityLinkRequired) redirect(nextAuthDestination(user,returnTo));
  return <main className="auth-page page-shell"><div className="auth-heading"><span className="eyebrow">Account protection</span><h1>Confirm before linking.</h1><p>A verified email sign-in matches an existing FlightForge password account. Email matching alone is never enough to merge them.</p></div><HostedAccountLinkForm returnTo={returnTo} email={user.email} /></main>;
}
