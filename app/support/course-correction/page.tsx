import type { Metadata } from "next";
import { CourseCorrectionForm } from "./CourseCorrectionForm";

export const metadata: Metadata = { title: "Correct a course listing", robots: { index: false, follow: false } };

export default async function CourseCorrectionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const courseId = typeof query.courseId === "string" ? query.courseId : "";
  const courseName = typeof query.courseName === "string" ? query.courseName : "";
  return <main className="legal-page page-shell"><header><span className="eyebrow">Data quality</span><h1>Correct a course listing</h1><p>Send factual changes with a public supporting source when possible. A reviewer will verify the evidence before publishing.</p></header><CourseCorrectionForm courseId={courseId} courseName={courseName} /></main>;
}
