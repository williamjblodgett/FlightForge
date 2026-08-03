import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ClaimReviewQueue } from "@/components/admin/ClaimReviewQueue";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { listCourseClaims } from "@/modules/courses/course-repository";
import { courses } from "@/modules/courses/demo-courses";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Claim review", robots: { index: false, follow: false } };

export default async function AdminClaimsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, "viewAdmin")) {
    return <main className="admin-access page-shell"><div className="access-card"><ShieldAlert aria-hidden="true" /><h1>Platform administrator access required</h1><p>This interface contains private claim evidence and audit decisions.</p><Link className="button button-primary" href="/sign-in?return_to=%2Fadmin%2Fclaims">Sign in with an administrator account</Link></div></main>;
  }
  const claims = await listCourseClaims().catch(() => []);
  return <AdminShell active="claims"><ClaimReviewQueue initialClaims={claims} courses={courses} /></AdminShell>;
}
