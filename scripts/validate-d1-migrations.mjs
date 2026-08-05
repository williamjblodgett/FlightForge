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

const requiredTables = [
  "catalog_sources", "disc_rating_versions", "plastic_families", "player_disc_profiles",
  "disc_observations", "events", "event_audit_events",
];
const tables = new Set(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
for (const table of requiredTables) {
  if (!tables.has(table)) throw new Error(`Required production table is missing after migration: ${table}`);
}

const playerDiscColumns = new Set(database.prepare("PRAGMA table_info(player_discs)").all().map((row) => row.name));
for (const column of ["disc_mold_id", "rating_version_id", "manual_speed", "wear_rating", "dome_profile", "run_name"]) {
  if (!playerDiscColumns.has(column)) throw new Error(`Required player_discs column is missing: ${column}`);
}

const enabledFlags = database.prepare(
  "SELECT key FROM feature_flags WHERE enabled = 1 AND key IN ('digital_bag', 'ai_caddie', 'event_publishing')",
).all();
if (enabledFlags.length !== 3) throw new Error("Production event, bag, and caddie feature flags were not seeded enabled.");

const tableCount = database.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type = 'table'").get().count;
console.log(`Applied ${files.length} D1 migrations; ${tableCount} tables available; production event/bag/caddie schema verified.`);
