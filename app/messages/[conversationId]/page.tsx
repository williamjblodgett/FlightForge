import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MessagesWorkspace } from "@/components/community/MessagesWorkspace";
import { getCurrentUser } from "@/modules/auth/current-user";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Conversation", robots: { index: false, follow: false } };

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const user = await getCurrentUser();
  const { conversationId } = await params;
  const returnTo = `/messages/${encodeURIComponent(conversationId)}`;
  if (!user) redirect(`/sign-in?return_to=${encodeURIComponent(returnTo)}`);
  if (user.identityLinkRequired) redirect("/account/link");
  if (user.mustChangePassword) redirect("/account/password");
  if (!user.onboardingComplete) redirect("/onboarding");
  return <MessagesWorkspace key={`${user.id}:${conversationId}`} initialConversationId={conversationId} viewerId={user.id} viewerName={user.displayName} />;
}
