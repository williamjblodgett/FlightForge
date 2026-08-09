import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPinned, ShieldCheck } from "lucide-react";
import { courses } from "@/modules/courses/demo-courses";

export const metadata: Metadata = {
  title: "New England disc golf courses",
  description: "Explore disc golf courses across all six New England states.",
  alternates: { canonical: "/places/new-england" },
};

const states = [
  { code: "ME", slug: "maine", name: "Maine", note: "Wooded courses, destination properties, and community layouts across the state." },
  { code: "MA", slug: "massachusetts", name: "Massachusetts", note: "Destination properties, local clubs, and public park courses." },
  { code: "NH", slug: "new-hampshire", name: "New Hampshire", note: "Municipal courses and multi-course properties across the Granite State." },
  { code: "VT", slug: "vermont", name: "Vermont", note: "Seasonal mountain golf with course-specific operating dates." },
  { code: "CT", slug: "connecticut", name: "Connecticut", note: "Park courses, local favorites, and destination layouts." },
  { code: "RI", slug: "rhode-island", name: "Rhode Island", note: "A compact network of public and community courses." },
] as const;

export default function NewEnglandPage() {
  return (
    <main className="region-page">
      <section className="region-hero page-shell">
        <span className="eyebrow">Six states · one place to explore</span>
        <h1>Find your next New England round.</h1>
        <p>Browse courses across Maine, New Hampshire, Vermont, Massachusetts, Connecticut, and Rhode Island. Check directly with the course before traveling for current hours and conditions.</p>
        <div className="region-hero-actions"><Link className="button button-primary" href="/courses">Open the regional map <MapPinned aria-hidden="true" /></Link><a className="button button-secondary" href="#states">Browse by state</a></div>
      </section>
      <section id="states" className="region-state-grid page-shell" aria-label="New England states">
        {states.map((state) => {
          const stateCourses = courses.filter((course) => course.state === state.code);
          const updatedCount = stateCourses.filter((course) => course.verificationLevel === "OPERATOR_SOURCE_REVIEWED").length;
          return <article key={state.code} className="region-state-card"><div><span>{state.code}</span><ShieldCheck aria-hidden="true" /></div><h2>{state.name}</h2><p>{state.note}</p><dl><div><dt>Courses listed</dt><dd>{stateCourses.length}</dd></div><div><dt>Details checked</dt><dd>{updatedCount}</dd></div></dl><Link href={`/places/${state.slug}`}>Explore {state.name} <ArrowRight aria-hidden="true" /></Link></article>;
        })}
      </section>
      <section className="region-method page-shell"><ShieldCheck aria-hidden="true" /><div><span className="eyebrow">Plan with confidence</span><h2>Useful course details, clearly presented.</h2><p>FlightForge includes course and public-agency information where available. Hours, access, fees, and conditions can change, so confirm with the course before traveling.</p><Link href="/courses">Browse all courses</Link></div></section>
    </main>
  );
}
