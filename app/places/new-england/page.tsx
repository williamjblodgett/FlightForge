import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPinned, ShieldCheck } from "lucide-react";
import { courses } from "@/modules/courses/demo-courses";

export const metadata: Metadata = {
  title: "New England disc golf courses",
  description: "Explore source-attributed disc golf courses across all six New England states.",
  alternates: { canonical: "/places/new-england" },
};

const states = [
  { code: "ME", slug: "maine", name: "Maine", note: "The launch directory and active re-verification baseline." },
  { code: "MA", slug: "massachusetts", name: "Massachusetts", note: "Destination properties and public park courses with primary evidence." },
  { code: "NH", slug: "new-hampshire", name: "New Hampshire", note: "Municipal courses and multi-course properties across the Granite State." },
  { code: "VT", slug: "vermont", name: "Vermont", note: "Seasonal mountain golf with course-specific operating dates." },
  { code: "CT", slug: "connecticut", name: "Connecticut", note: "Park and destination courses backed by current facility sources." },
  { code: "RI", slug: "rhode-island", name: "Rhode Island", note: "A compact public-course network with municipal evidence." },
] as const;

export default function NewEnglandPage() {
  return (
    <main className="region-page">
      <section className="region-hero page-shell">
        <span className="eyebrow">Six states · one field book</span>
        <h1>New England, checked at the source.</h1>
        <p>FlightForge separates a course’s existence from its same-day availability. Every new-state launch record points to the operator or public agency supporting the facts.</p>
        <div className="region-hero-actions"><Link className="button button-primary" href="/courses">Open the regional map <MapPinned aria-hidden="true" /></Link><a className="button button-secondary" href="#states">Browse by state</a></div>
      </section>
      <section id="states" className="region-state-grid page-shell" aria-label="New England states">
        {states.map((state) => {
          const stateCourses = courses.filter((course) => course.state === state.code);
          const primaryCount = stateCourses.filter((course) => course.verificationLevel === "OPERATOR_SOURCE_REVIEWED").length;
          return <article key={state.code} className="region-state-card"><div><span>{state.code}</span><ShieldCheck aria-hidden="true" /></div><h2>{state.name}</h2><p>{state.note}</p><dl><div><dt>Published records</dt><dd>{stateCourses.length}</dd></div><div><dt>Primary-source reviewed</dt><dd>{primaryCount}</dd></div></dl><Link href={`/places/${state.slug}`}>Explore {state.name} <ArrowRight aria-hidden="true" /></Link></article>;
        })}
      </section>
      <section className="region-method page-shell"><ShieldCheck aria-hidden="true" /><div><span className="eyebrow">Verification method</span><h2>Directory leads stay backstage.</h2><p>New-state courses publish only after an operator, municipality, park, school, university, or facility source confirms the location. “Open now” is never inferred from a normal schedule.</p><Link href="/courses">Inspect every source</Link></div></section>
    </main>
  );
}
