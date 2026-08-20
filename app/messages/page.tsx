import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MessagesWorkspace } from "@/components/community/MessagesWorkspace";
import { getCurrentUser } from "@/modules/auth/current-user";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Messages", robots: { index: false, follow: false } };

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?return_to=/messages");
  if (user.identityLinkRequired) redirect("/account/link");
  if (user.mustChangePassword) redirect("/account/password");
  if (!user.onboardingComplete) redirect("/onboarding");
  return <MessagesWorkspace key={user.id} viewerId={user.id} viewerName={user.displayName} />;
}
