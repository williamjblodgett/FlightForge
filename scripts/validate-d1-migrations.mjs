import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";

const database = new DatabaseSync(":memory:");
const files = (await readdir(new URL("../drizzle/", import.meta.url)))
  .filter((file) => /^\d{4}_.+\.sql$/u.test(file))
  .sort();

for (const file of files) {
  const sql = await readFile(new URL(`../drizzle/${file}`, import.meta.url), "utf8");
  database.exec(sql.replaceAll("--> statement-breakpoint", ""));
}

const tableCount = database.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type = 'table'").get().count;
console.log(`Applied ${files.length} D1 migrations; ${tableCount} tables available.`);
