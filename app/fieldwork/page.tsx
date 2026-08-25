import type { Metadata } from "next";
import { Crosshair, MapPinned, Ruler, ShieldAlert } from "lucide-react";
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
            <h1 id="fieldwork-title">Find space.<br /><span>Mark the throw.</span></h1>
            <p>Locate nearby publicly accessible disc-golf properties, then measure from your throwing point to the disc with your phone’s GPS.</p>
          </div>
          <div className={styles.heroReadout} aria-label="How Fieldwork works">
            <div><MapPinned aria-hidden="true" /><span><b>01</b> Find a nearby place</span></div>
            <div><Crosshair aria-hidden="true" /><span><b>02</b> Mark your release point</span></div>
            <div><Ruler aria-hidden="true" /><span><b>03</b> Mark the landing</span></div>
          </div>
        </div>
      </section>

      <section className={`${styles.safetyStrip} page-shell`} aria-labelledby="fieldwork-safety-title">
        <ShieldAlert aria-hidden="true" />
        <div>
          <h2 id="fieldwork-safety-title">A course listing is not permission to use a fairway for practice.</h2>
          <p>Use only a designated practice area or an empty field where throwing is allowed. Never throw toward players, walkers, roads, homes, animals, or active holes. Check posted rules and ask the property operator when unsure.</p>
        </div>
      </section>

      <FieldworkWorkspace candidates={candidates} />
    </main>
  );
}
