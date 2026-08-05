import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BagWorkspace } from "@/components/bags/BagWorkspace";
import { getAccountSettings } from "@/modules/auth/account-repository";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { isFeatureEnabled } from "@/modules/config/feature-flags";
import { listCatalogDiscs, listPlayerDiscs } from "@/modules/bags/bag-repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My bag & virtual caddie", description: "Track each owned disc and request explainable recommendations from the discs you actually carry." };

export default async function BagPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?returnTo=%2Fbag");
  if (user.mustChangePassword) redirect("/account/password");
  if (!can(user, "manageOwnBag")) redirect("/");
  const [bagEnabled, caddieEnabled] = await Promise.all([
    isFeatureEnabled("digital_bag"),
    isFeatureEnabled("ai_caddie"),
  ]);
  if (!bagEnabled) return <main className="access-page page-shell"><span className="eyebrow">Digital bag</span><h1>Bag access is temporarily paused.</h1><p>Your existing collection remains stored and unchanged.</p></main>;
  const [catalogResult, discResult, settingsResult] = await Promise.all([
    listCatalogDiscs().then((catalog) => ({ catalog, error: false })).catch(() => ({ catalog: [], error: true })),
    listPlayerDiscs(user).then((discs) => ({ discs, error: false })).catch(() => ({ discs: [], error: true })),
    getAccountSettings(user).catch(() => null),
  ]);
  if (catalogResult.error || discResult.error) return <main className="access-page page-shell"><span className="eyebrow">Digital bag</span><h1>Your bag is temporarily unavailable.</h1><p>No collection data was discarded. Please try again shortly.</p></main>;
  const hand = settingsResult?.throwingHand === "LEFT" ? "LEFT" : "RIGHT";
  return <main className="bag-page page-shell"><BagWorkspace initialDiscs={discResult.discs} catalog={catalogResult.catalog} controlledDistanceFeet={settingsResult?.controlledDistanceFeet ?? null} throwingHand={hand} caddieEnabled={caddieEnabled} /></main>;
}
