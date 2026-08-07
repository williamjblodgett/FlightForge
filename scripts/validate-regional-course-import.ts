import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { authoritativeRegionalCourseBatchSchema } from "../modules/courses/validation";

const inputPath = resolve(process.argv[2] ?? "data/import/new-england-courses.authoritative.json");
const input = JSON.parse(await readFile(inputPath, "utf8")) as unknown;
const result = authoritativeRegionalCourseBatchSchema.safeParse(input);

if (!result.success) {
  console.error(JSON.stringify(result.error.flatten(), null, 2));
  process.exitCode = 1;
} else {
  const duplicateSlugs = repeated(result.data.records.map((record) => record.slug));
  const duplicateExternalIds = repeated(result.data.records.map((record) => record.external_id));
  const states = [...new Set(result.data.records.map((record) => record.state))].sort();
  const invalidFacilityGroups = result.data.records
    .filter((record) => record.record_type === "FACILITY_COURSE")
    .filter((record) => result.data.records.filter((candidate) => candidate.facility_id === record.facility_id).length < 2)
    .map((record) => record.facility_id);

  const valid = duplicateSlugs.length === 0 && duplicateExternalIds.length === 0 && invalidFacilityGroups.length === 0 && states.length === 5;
  console.log(JSON.stringify({
    valid,
    batchId: result.data.batch_id,
    recordCount: result.data.records.length,
    states,
    primarySourceRecords: result.data.records.filter((record) => record.source_type === "COURSE_OWNER" || record.source_type === "PUBLIC_AGENCY").length,
    duplicateSlugs,
    duplicateExternalIds,
    invalidFacilityGroups: [...new Set(invalidFacilityGroups)],
  }, null, 2));
  if (!valid) process.exitCode = 1;
}

function repeated(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].filter(([, count]) => count > 1).map(([value]) => value);
}
