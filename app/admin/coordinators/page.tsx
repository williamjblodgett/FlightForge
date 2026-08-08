import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { listCoordinatorApplications } from "@/modules/events/coordinator-repository";
import { CoordinatorReviewList } from "./CoordinatorReviewList";

export const dynamic = "force-dynamic";
export default async function CoordinatorAdminPage() { const user = await getCurrentUser(); if (!user || !can(user, "viewAdmin")) return <main className="legal-page page-shell"><h1>Platform administrator access required</h1></main>; const applications = await listCoordinatorApplications().catch(() => []); return <main className="manage-events-page page-shell"><header className="manage-events-heading"><div><span className="eyebrow">Administrator review</span><h1>Coordinator applications</h1><p>Approvals create an organization membership and grant access only to the selected course.</p></div></header><CoordinatorReviewList initial={applications} /></main>; }
