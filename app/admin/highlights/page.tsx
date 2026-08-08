import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { HoleHighlightReviewQueue } from "@/components/admin/HoleHighlightReviewQueue";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { listPendingHighlights } from "@/modules/highlights/highlight-repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hole video moderation", robots: { index: false, follow: false } };

export default async function HighlightModerationPage() {
  const user = await getCurrentUser();
  if (!can(user, "moderateHoleHighlights")) return <main className="admin-access page-shell"><div className="access-card"><ShieldAlert aria-hidden="true" /><h1>Platform administrator access required</h1><p>This queue contains private, unapproved community videos.</p><Link className="button button-primary" href="/sign-in?return_to=%2Fadmin%2Fhighlights">Sign in with an administrator account</Link></div></main>;
  return <AdminShell active="highlights"><HoleHighlightReviewQueue initialHighlights={await listPendingHighlights().catch(() => [])} /></AdminShell>;
}
