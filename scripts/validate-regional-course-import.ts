import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { authoritativeRegionalCourseBatchSchema } from "../modules/courses/validation";

const inputPaths = process.argv.length > 2
  ? process.argv.slice(2).map((path) => resolve(path))
  : [
      "data/import/new-england-courses.authoritative.json",
      "data/import/new-england-expansion-north.reviewed.json",
      "data/import/new-england-expansion-south.reviewed.json",
    ].map((path) => resolve(path));
const inputs = await Promise.all(inputPaths.map(async (path) => JSON.parse(await readFile(path, "utf8")) as unknown));
const results = inputs.map((input) => authoritativeRegionalCourseBatchSchema.safeParse(input));
const failed = results.find((result) => !result.success);

if (failed && !failed.success) {
  console.error(JSON.stringify(failed.error.flatten(), null, 2));
  process.exitCode = 1;
} else {
  const records = results.flatMap((result) => result.success ? result.data.records : []);
  const duplicateSlugs = repeated(records.map((record) => record.slug));
  const duplicateExternalIds = repeated(records.map((record) => record.external_id));
  const states = [...new Set(records.map((record) => record.state))].sort();
  const invalidFacilityGroups = records
    .filter((record) => record.record_type === "FACILITY_COURSE")
    .filter((record) => records.filter((candidate) => candidate.facility_id === record.facility_id).length < 2)
    .map((record) => record.facility_id);

  const valid = duplicateSlugs.length === 0 && duplicateExternalIds.length === 0 && invalidFacilityGroups.length === 0 && states.length === 5;
  console.log(JSON.stringify({
    valid,
    batchIds: results.flatMap((result) => result.success ? [result.data.batch_id] : []),
    recordCount: records.length,
    states,
    primarySourceRecords: records.filter((record) => record.source_type === "COURSE_OWNER" || record.source_type === "PUBLIC_AGENCY").length,
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
