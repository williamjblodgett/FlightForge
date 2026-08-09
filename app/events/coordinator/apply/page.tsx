import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/current-user";
import { courses } from "@/modules/courses/demo-courses";
import { CoordinatorApplicationForm } from "./CoordinatorApplicationForm";

export const metadata: Metadata = { title: "Coordinator application", robots: { index: false, follow: false } };
export default async function CoordinatorApplyPage() { const user = await getCurrentUser(); if (!user) redirect("/sign-in?return_to=/events/coordinator/apply"); return <main className="legal-page page-shell"><header><span className="eyebrow">Event coordinator access</span><h1>Apply as an event coordinator</h1><p>Tell us which course and organization you represent. Approval is limited to events at that course.</p></header><CoordinatorApplicationForm courses={courses.map(({ id, name, city, state }) => ({ id, name, city, state }))} /></main>; }
