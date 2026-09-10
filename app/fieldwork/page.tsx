import type { Metadata } from "next";
import { Crosshair, ShieldAlert } from "lucide-react";
import { courses } from "@/modules/courses/demo-courses";
import { buildPracticeCandidates } from "@/modules/fieldwork/practice-candidates";
import { FieldworkWorkspace } from "./FieldworkWorkspace";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Fieldwork",
  description: "Find nearby public disc-golf properties and estimate throw distance with two high-accuracy phone location captures.",
};

export default function FieldworkPage() {
  const candidates = buildPracticeCandidates(courses);

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="fieldwork-title">
        <div className={`${styles.heroInner} page-shell`}>
          <div className={styles.heroCopy}>
            <span className={styles.kicker}><Crosshair aria-hidden="true" /> Fieldwork</span>
            <h1 id="fieldwork-title">Fieldwork</h1>
            <p>Practice with purpose. Find a place or measure a throw.</p>
          </div>
        </div>
      </section>

      <section className={`${styles.safetyStrip} page-shell`} aria-labelledby="fieldwork-safety-title">
        <ShieldAlert aria-hidden="true" />
        <details>
          <summary id="fieldwork-safety-title">Check permission and keep your practice area clear.</summary>
          <p>Use only a designated practice area or an empty field where throwing is allowed. Never throw toward players, walkers, roads, homes, animals, or active holes. Check posted rules and ask the property operator when unsure.</p>
        </details>
      </section>

      <FieldworkWorkspace candidates={candidates} />
    </main>
  );
}
