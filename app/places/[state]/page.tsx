import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CoursesPage from "@/app/courses/page";

export const dynamic = "force-dynamic";

const states: Record<string, { code: string; name: string }> = {
  maine: { code: "ME", name: "Maine" },
  massachusetts: { code: "MA", name: "Massachusetts" },
  "new-hampshire": { code: "NH", name: "New Hampshire" },
  vermont: { code: "VT", name: "Vermont" },
  connecticut: { code: "CT", name: "Connecticut" },
  "rhode-island": { code: "RI", name: "Rhode Island" },
};

type Props = { params: Promise<{ state: string }>; searchParams: Promise<Record<string,string|string[]|undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state } = await params;
  const selected = states[state];
  if (!selected) return {};
  return {
    title: `Disc golf courses in ${selected.name}`,
    description: `Explore disc golf courses in ${selected.name}.`,
    alternates: { canonical: `/places/${state}` },
  };
}

export default async function StateCoursePage({ params, searchParams }: Props) {
  const { state } = await params;
  const selected = states[state];
  if (!selected) notFound();
  return <CoursesPage searchParams={Promise.resolve({...await searchParams,state:selected.code})}/>;
}
