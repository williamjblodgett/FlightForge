import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/current-user";
import { courses } from "@/modules/courses/demo-courses";
import { CoordinatorApplicationForm } from "./CoordinatorApplicationForm";

export const metadata: Metadata = { title: "Coordinator application", robots: { index: false, follow: false } };
export default async function CoordinatorApplyPage() { const user = await getCurrentUser(); if (!user) redirect("/sign-in?return_to=/events/coordinator/apply"); return <main className="legal-page page-shell"><header><span className="eyebrow">Scoped event access</span><h1>Apply as an event coordinator</h1><p>Tell reviewers which course and organization you represent. Approval is tied to that course and is recorded in the audit log.</p></header><CoordinatorApplicationForm courses={courses.map(({ id, name, city, state }) => ({ id, name, city, state }))} /></main>; }
