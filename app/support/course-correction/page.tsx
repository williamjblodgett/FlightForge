import type { Metadata } from "next";
import { CourseCorrectionForm } from "./CourseCorrectionForm";

export const metadata: Metadata = { title: "Correct a course listing", robots: { index: false, follow: false } };

export default async function CourseCorrectionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const courseId = typeof query.courseId === "string" ? query.courseId : "";
  const courseName = typeof query.courseName === "string" ? query.courseName : "";
  return <main className="legal-page page-shell"><header><span className="eyebrow">Help keep listings accurate</span><h1>Correct a course listing</h1><p>Tell us what changed and include a public link when possible. Our team will review the update before publishing it.</p></header><CourseCorrectionForm courseId={courseId} courseName={courseName} /></main>;
}
