import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { discCatalogImportSchema } from "../modules/discs/catalog-validation";

const inputPath = resolve(process.argv[2] ?? "data/import/disc-catalog.reviewed.json");
const input = JSON.parse(await readFile(inputPath, "utf8")) as unknown;
const result = discCatalogImportSchema.safeParse(input);

if (!result.success) {
  console.error(JSON.stringify(result.error.flatten(), null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    valid: true,
    batchId: result.data.batch_id,
    recordCount: result.data.records.length,
    manufacturers: [...new Set(result.data.records.map((record) => record.manufacturer.name))],
    sourceUrls: [...new Set(result.data.records.map((record) => record.source.url))],
  }, null, 2));
}
