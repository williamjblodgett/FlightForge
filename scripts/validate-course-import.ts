import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { courseImportBatchSchema, courseImportRecordSchema } from "../modules/courses/validation";
import { detectDuplicateCandidates } from "../modules/imports/course-import";

const inputPath = resolve(process.argv[2] ?? "data/import/maine-courses.reviewed.json");
const input = await readFile(inputPath, "utf8");
const extension = extname(inputPath).toLowerCase();

const result =
  extension === ".json"
    ? courseImportBatchSchema.safeParse(JSON.parse(input) as unknown)
    : extension === ".csv"
      ? parseCsvBatch(input)
      : null;

if (!result) {
  console.error("Unsupported import format. Use a .json or .csv file.");
  process.exitCode = 1;
} else if (!result.success) {
  console.error(JSON.stringify(result.error.flatten(), null, 2));
  process.exitCode = 1;
} else {
  const duplicates = detectDuplicateCandidates(result.data.records);
  console.log(
    JSON.stringify(
      {
        valid: true,
        batchId: result.data.batch_id,
        formatVersion: result.data.format_version,
        recordCount: result.data.records.length,
        duplicateCandidateCount: duplicates.length,
        duplicateCandidates: duplicates,
        changePreview: result.data.records.map((record) => ({
          externalId: record.external_id,
          action: "CREATE_OR_MANUAL_MATCH",
          course: `${record.name} — ${record.city}, ${record.state}`,
          source: record.source_url,
        })),
      },
      null,
      2,
    ),
  );
}

function parseCsvBatch(csv: string) {
  const rows = csv
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);
  const [headers, ...values] = rows;
  if (!headers) return courseImportBatchSchema.safeParse({});
  const records = values.map((row) => {
    const raw = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
    return courseImportRecordSchema.parse({
      ...raw,
      postal_code: raw.postal_code || null,
      latitude: raw.latitude ? Number(raw.latitude) : null,
      longitude: raw.longitude ? Number(raw.longitude) : null,
      is_fictional_demo: raw.is_fictional_demo === "true",
    });
  });
  return courseImportBatchSchema.safeParse({
    format_version: "1.0",
    batch_id: crypto.randomUUID(),
    source_label: `CSV preview: ${inputPath}`,
    imported_at: new Date().toISOString(),
    records,
  });
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      fields.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  fields.push(value.trim());
  return fields;
}
