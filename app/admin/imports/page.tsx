import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Database, ExternalLink, ShieldAlert } from "lucide-react";
import statewideBatch from "@/data/import/maine-courses.statewide.json";
import operatorReview from "@/data/import/maine-course-authoritative-overrides.json";
import regionalBatch from "@/data/import/new-england-courses.authoritative.json";
import { AdminShell } from "@/components/admin/AdminShell";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Import review", robots: { index: false, follow: false } };

type BatchRecord = {
  external_id: string;
  name: string;
  city: string;
  state: string;
  operational_status: string;
  verification_level: string;
  source_name: string;
  source_url: string;
};

type RegionalRecord = {
  external_id: string;
  name: string;
  facility_id: string;
  record_type: string;
  city: string;
  state: string;
  operational_status: string;
  source_name: string;
  source_url: string;
  source_type: string;
  source_checked_at: string;
  next_review_due_at: string;
  location_precision: string;
};

export default async function AdminImportsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, "viewAdmin")) {
    return <main className="admin-access page-shell"><div className="access-card"><ShieldAlert aria-hidden="true" /><h1>Platform administrator access required</h1><p>Course imports require a protected manual review.</p><Link className="button button-primary" href="/sign-in?return_to=%2Fadmin%2Fimports">Sign in with an administrator account</Link></div></main>;
  }

  const batch = statewideBatch as unknown as {
    batch_id: string;
    generated_at: string;
    counts: { udisc_records: number; pdga_records: number; cross_checked_records: number; unavailable_reported: number };
    records: BatchRecord[];
  };
  const operatorCount = (operatorReview as { records: Array<{ slugs: string[] }> }).records.reduce((total, record) => total + record.slugs.length, 0);
  const regional = regionalBatch as unknown as {
    batch_id: string;
    generated_at: string;
    policy: string;
    candidate_estimates: Record<string, number>;
    records: RegionalRecord[];
  };
  const stateCounts = Object.entries(
    regional.records.reduce<Record<string, number>>((counts, record) => {
      counts[record.state] = (counts[record.state] ?? 0) + 1;
      return counts;
    }, {}),
  );

  return (
    <AdminShell active="imports">
      <section>
        <div className="admin-section-heading">
          <div><span className="eyebrow">Regional release gate</span><h2>Authoritative New England launch set</h2><p>Only operator and public-agency records can enter the five-state expansion. Directory estimates remain an unpublished research queue.</p></div>
          <span className="import-health is-valid"><CheckCircle2 aria-hidden="true" />{regional.records.length} records publishable</span>
        </div>
        <div className="import-summary-grid">
          <article><Database aria-hidden="true" /><span>Evidence batch</span><strong>{regional.batch_id.slice(0, 8)}</strong><small>{new Date(regional.generated_at).toLocaleDateString("en-US")}</small></article>
          <article><span className="summary-number">5</span><span>new states represented</span><strong>{stateCounts.map(([state, count]) => `${state} ${count}`).join(" · ")}</strong><small>Released together from one reviewed batch</small></article>
          <article><span className="summary-number">0</span><span>directory-only new-state records</span><strong>{Object.values(regional.candidate_estimates).reduce((sum, count) => sum + count, 0)} discovery candidates</strong><small>Candidate totals are not publication claims</small></article>
        </div>
        <div className="responsive-table-wrap"><table><caption className="sr-only">Authoritative New England course evidence</caption><thead><tr><th>Course</th><th>Location</th><th>Primary evidence</th><th>Status</th><th>Review</th></tr></thead><tbody>{regional.records.map((record) => <tr key={record.external_id}><td><strong>{record.name}</strong><small>{record.record_type.replaceAll("_", " ")} · {record.facility_id}</small></td><td>{record.city}, {record.state}<small>{record.location_precision.replaceAll("_", " ")}</small></td><td><a href={record.source_url} target="_blank" rel="noreferrer">{record.source_name} <ExternalLink aria-hidden="true" /></a><small>{record.source_type.replaceAll("_", " ")}</small></td><td><span className="status-chip status-reviewed">{record.operational_status.replaceAll("_", " ")}</span></td><td><strong>{new Date(record.source_checked_at).toLocaleDateString("en-US")}</strong><small>Due {new Date(record.next_review_due_at).toLocaleDateString("en-US")}</small></td></tr>)}</tbody></table></div>
        <div className="import-notes"><h3>Regional publication policy</h3><p>{regional.policy}</p><ul><li>Facility and entrance coordinates were independently geocoded and labeled by precision</li><li>Multi-course properties share a facility identity instead of inflating venue counts</li><li>Same-day “open now” is never inferred from normal operating status</li><li>Unresolved candidates remain unpublished until primary evidence is available</li></ul></div>
      </section>
      <section>
        <div className="admin-section-heading">
          <div><span className="eyebrow">Data operations</span><h2>Maine statewide evidence ledger</h2><p>Review factual listings and their availability evidence. “Available” never means open right now.</p></div>
          <span className="import-health is-valid"><CheckCircle2 aria-hidden="true" />120 rows validated</span>
        </div>
        <div className="import-summary-grid">
          <article><Database aria-hidden="true" /><span>Batch</span><strong>{batch.batch_id.slice(0, 8)}</strong><small>{new Date(batch.generated_at).toLocaleDateString("en-US")}</small></article>
          <article><span className="summary-number">{batch.counts.udisc_records}</span><span>Current directory rows</span><strong>{batch.counts.cross_checked_records} independently matched</strong><small>Against {batch.counts.pdga_records} PDGA directory records</small></article>
          <article><span className="summary-number">{operatorCount}</span><span>Operator-source reviews</span><strong>{batch.counts.unavailable_reported} unavailable listing</strong><small>Same-day status still requires confirmation</small></article>
        </div>
        <div className="responsive-table-wrap"><table><caption className="sr-only">Statewide Maine course import evidence</caption><thead><tr><th>Course</th><th>Location</th><th>Evidence</th><th>Status</th><th>Claim</th></tr></thead><tbody>{batch.records.map((record) => <tr key={record.external_id}><td><strong>{record.name}</strong><small>{record.external_id}</small></td><td>{record.city}, {record.state}</td><td><a href={record.source_url} target="_blank" rel="noreferrer">{record.source_name} <ExternalLink aria-hidden="true" /></a><small>{record.verification_level.replaceAll("_", " ")}</small></td><td><span className={`status-chip${record.operational_status === "UNAVAILABLE_REPORTED" ? " status-warning" : " status-reviewed"}`}>{record.operational_status.replaceAll("_", " ")}</span></td><td>Unclaimed</td></tr>)}</tbody></table></div>
        <div className="import-notes"><h3>Research and import safeguards</h3><ul><li>Current statewide directory pagination</li><li>PDGA name, city, and proximity cross-check</li><li>Operator-source overrides kept separately</li><li>No copied descriptions, photos, ratings, reviews, or maps</li><li>Every record includes source and checked timestamp</li><li>Rollback-safe batch and manual-review foundation</li></ul></div>
      </section>
    </AdminShell>
  );
}
