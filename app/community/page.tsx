import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CommunityHub } from "@/components/community/CommunityHub";
import { getCurrentUser } from "@/modules/auth/current-user";
import { brand } from "@/config/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Disc golf community",
  description: `Connect with disc golfers, courses, and events across New England in the ${brand.productName} community.`,
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CommunityPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const query = await searchParams;
  if (user?.identityLinkRequired) redirect("/account/link");
  if (user?.mustChangePassword) redirect("/account/password");
  if (user && !user.onboardingComplete) redirect("/onboarding");
  return <CommunityHub signedIn={Boolean(user)} viewerName={user?.displayName} initialContext={parseContext(query.context, query.id)} />;
}

function parseContext(context: string | string[] | undefined, id: string | string[] | undefined) {
  if (typeof context !== "string" || typeof id !== "string" || !/^[A-Za-z0-9:_-]{2,200}$/u.test(id)) return undefined;
  if (context === "course") return { type: "COURSE" as const, id };
  if (context === "event") return { type: "EVENT" as const, id };
  return undefined;
}
