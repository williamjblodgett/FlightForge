import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Database, ExternalLink, ShieldAlert } from "lucide-react";
import seedBatch from "@/data/import/maine-courses.reviewed.json";
import { AdminShell } from "@/components/admin/AdminShell";
import { getCurrentUser } from "@/modules/auth/current-user";
import { can } from "@/modules/auth/permissions";
import { getImportBatchSummary } from "@/modules/courses/course-repository";
import { courseImportBatchSchema } from "@/modules/courses/validation";
import { detectDuplicateCandidates } from "@/modules/imports/course-import";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Import review", robots: { index: false, follow: false } };

export default async function AdminImportsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, "viewAdmin")) {
    return <main className="admin-access page-shell"><div className="access-card"><ShieldAlert aria-hidden="true" /><h1>Platform administrator access required</h1><p>Course imports require a protected manual review.</p><Link className="button button-primary" href="/sign-in?return_to=%2Fadmin%2Fimports">Sign in with an administrator account</Link></div></main>;
  }
  const parsed = courseImportBatchSchema.safeParse(seedBatch);
  const duplicates = parsed.success ? detectDuplicateCandidates(parsed.data.records) : [];
  const persisted = await getImportBatchSummary().catch(() => null);
  return (
    <AdminShell active="imports">
      <section>
        <div className="admin-section-heading"><div><span className="eyebrow">Data operations</span><h2>Maine seed import</h2><p>Preview sources, validation, and duplicate candidates before records become public.</p></div><span className={`import-health${parsed.success ? " is-valid" : ""}`}>{parsed.success ? <CheckCircle2 aria-hidden="true" /> : <ShieldAlert aria-hidden="true" />}{parsed.success ? "Schema valid" : "Validation failed"}</span></div>
        <div className="import-summary-grid">
          <article><Database aria-hidden="true" /><span>Batch</span><strong>{persisted?.sourceLabel ?? seedBatch.source_label}</strong><small>{persisted?.status ?? "Source file only"}</small></article>
          <article><span className="summary-number">{parsed.success ? parsed.data.records.length : 0}</span><span>Records</span><strong>Reviewed seed rows</strong><small>Importer limit: 5,000</small></article>
          <article><span className="summary-number">{duplicates.length}</span><span>Duplicate candidates</span><strong>{duplicates.length ? "Manual review needed" : "No within-batch matches"}</strong><small>Normalized name, city, source ID, proximity</small></article>
        </div>
        {parsed.success ? (
          <div className="responsive-table-wrap"><table><caption className="sr-only">Reviewed Maine seed import records</caption><thead><tr><th>Course</th><th>Location</th><th>Source</th><th>Verification</th><th>Claim</th></tr></thead><tbody>{parsed.data.records.map((record) => <tr key={record.external_id}><td><strong>{record.name}</strong><small>{record.external_id}</small></td><td>{record.city}, {record.state}</td><td><a href={record.source_url} target="_blank" rel="noreferrer">{record.source_name} <ExternalLink aria-hidden="true" /></a></td><td><span className="status-chip status-reviewed">Source reviewed</span></td><td>Unclaimed</td></tr>)}</tbody></table></div>
        ) : <pre className="validation-output">{JSON.stringify(parsed.error.flatten(), null, 2)}</pre>}
        <div className="import-notes"><h3>Importer safety controls represented</h3><ul><li>CSV and JSON versioned contracts</li><li>Batch IDs and source attribution</li><li>Strict validation with a 5,000-row cap</li><li>Duplicate candidate detection</li><li>Manual review before apply</li><li>Immutable batch summary for rollback targeting</li></ul></div>
      </section>
    </AdminShell>
  );
}
