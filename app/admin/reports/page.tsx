import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { CommunityReportQueue } from "@/components/admin/CommunityReportQueue";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { listOpenReports } from "@/modules/community/community-repository";
import type { CommunityReportRecord } from "@/modules/community/types";
import { logError } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Community reports", robots: { index: false, follow: false } };

export default async function AdminReportsPage() {
  const user = await getCurrentUser();
  if (!can(user, "viewAdmin")) return <main className="admin-access page-shell"><div className="access-card"><ShieldAlert aria-hidden="true" /><h1>Platform administrator access required</h1><p>Community reports contain private safety information.</p><Link className="button button-primary" href="/sign-in?return_to=%2Fadmin%2Freports">Sign in with an administrator account</Link></div></main>;
  let reports: CommunityReportRecord[] = [];
  let initialLoadError: string | null = null;
  try {
    reports = await listOpenReports(user!);
  } catch (error) {
    logError("admin.community_reports.load_failed", error, { adminUserId: user!.id });
    initialLoadError = "The moderation queue could not be loaded. No reports were hidden or marked as reviewed.";
  }
  return <AdminShell active="reports"><CommunityReportQueue initialReports={reports} initialLoadError={initialLoadError} /></AdminShell>;
}
