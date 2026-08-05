import rawCatalog from "@/data/import/disc-catalog.reviewed.json";
import { getD1Database } from "@/db/runtime";
import { CADDIE_MODEL_VERSION, recommendShot, type ShotRecommendation } from "@/modules/ai-caddie/recommend-shot";
import { ensurePersistedUserId } from "@/modules/auth/account-repository";
import type { AuthenticatedUser } from "@/modules/auth/types";
import { discCatalogImportSchema } from "@/modules/discs/catalog-validation";
import type { DiscStability, PlayerDisc } from "./bag-intelligence";
import type { CaddieFeedbackInput, CaddieRequestInput, PlayerDiscInput } from "./validation";

const catalogSeed = discCatalogImportSchema.parse(rawCatalog);

export type CatalogDisc = {
  id: string;
  manufacturer: string;
  mold: string;
  category: string;
  speed: number;
  glide: number;
  turn: number;
  fade: number;
  plastics: string[];
  ratingVersionId: string;
  ratingSystem: string;
  ratingSource: string;
  ratingSourceUrl: string;
  checkedAt: string;
  approvedReference: string | null;
};

export type DiscProfile = {
  throwType: "BACKHAND" | "FOREHAND";
  sampleCount: number;
  typicalDistanceFeet: number | null;
  successRate: number | null;
  observedTurn: number | null;
  observedFade: number | null;
  confidence: number;
};

export type PlayerDiscRecord = {
  id: string;
  catalogMoldId: string | null;
  ratingVersionId: string | null;
  manufacturerName: string;
  moldName: string;
  category: string | null;
  plastic: string | null;
  weightGrams: number | null;
  color: string | null;
  nickname: string | null;
  condition: "NEW" | "GOOD" | "SEASONED" | "BEAT_IN";
  wearRating: number;
  domeProfile: "FLAT" | "NEUTRAL" | "DOMEY" | null;
  runName: string | null;
  status: "IN_BAG" | "STORAGE" | "LOST" | "RETIRED" | "REPLACEMENT_NEEDED";
  notes: string | null;
  speed: number;
  glide: number;
  turn: number;
  fade: number;
  stability: DiscStability;
  ratingSource: string | null;
  ratingSourceUrl: string | null;
  profiles: DiscProfile[];
  createdAt: string;
  updatedAt: string;
  version: number;
};

export class BagConflictError extends Error {
  constructor(message = "This disc changed in another session. Refresh and try again.") {
    super(message);
    this.name = "BagConflictError";
  }
}

let schemaInitialization: Promise<void> | null = null;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS manufacturers (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL, website TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS disc_molds (
    id TEXT PRIMARY KEY, manufacturer_id TEXT NOT NULL, name TEXT NOT NULL, slug TEXT,
    category TEXT NOT NULL, speed TEXT, glide TEXT, turn TEXT, fade TEXT,
    approved_reference TEXT, pdga_certification_number TEXT, approved_at TEXT,
    max_weight_grams REAL, diameter_cm REAL, height_cm REAL, rim_depth_cm REAL,
    rim_thickness_cm REAL, is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS disc_variants (
    id TEXT PRIMARY KEY, disc_mold_id TEXT NOT NULL, plastic TEXT, plastic_family_id TEXT,
    run_name TEXT, weight_grams INTEGER, color TEXT, stability TEXT, source_id TEXT,
    catalog_metadata_json TEXT, is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS player_discs (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, disc_mold_id TEXT, disc_variant_id TEXT,
    rating_version_id TEXT, manufacturer_name TEXT, mold_name TEXT NOT NULL,
    manual_speed REAL, manual_glide REAL, manual_turn REAL, manual_fade REAL,
    plastic TEXT, weight_grams INTEGER, color TEXT, nickname TEXT, condition TEXT,
    wear_rating INTEGER NOT NULL DEFAULT 0, dome_profile TEXT, run_name TEXT,
    status TEXT NOT NULL DEFAULT 'IN_BAG', purchase_date TEXT,
    purchase_price_cents INTEGER, photo_key TEXT, notes TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS bags (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL,
    bag_type TEXT NOT NULL DEFAULT 'PRIMARY', is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS bag_slots (
    id TEXT PRIMARY KEY, bag_id TEXT NOT NULL, player_disc_id TEXT NOT NULL,
    category TEXT, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ai_sessions (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, feature TEXT NOT NULL, provider TEXT,
    model_version TEXT, prompt_version TEXT, output_schema_version TEXT,
    status TEXT NOT NULL, started_at TEXT NOT NULL, completed_at TEXT, latency_ms INTEGER,
    usage_json TEXT, cost_micros INTEGER, safety_result TEXT, failure_reason TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS ai_recommendations (
    id TEXT PRIMARY KEY, ai_session_id TEXT NOT NULL, user_id TEXT NOT NULL,
    recommendation_type TEXT NOT NULL, input_summary_json TEXT NOT NULL,
    output_json TEXT NOT NULL, confidence TEXT, created_at TEXT NOT NULL, expires_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS ai_feedback (
    id TEXT PRIMARY KEY, ai_recommendation_id TEXT NOT NULL, user_id TEXT NOT NULL,
    rating TEXT, correction_json TEXT, comment TEXT, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY, actor_user_id TEXT, organization_id TEXT, action TEXT NOT NULL,
    resource_type TEXT NOT NULL, resource_id TEXT, reason TEXT, request_id TEXT,
    metadata_json TEXT, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS catalog_sources (
    id TEXT PRIMARY KEY, source_type TEXT NOT NULL, source_name TEXT NOT NULL,
    source_url TEXT NOT NULL, license_note TEXT, checked_at TEXT NOT NULL,
    is_authoritative INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS catalog_sources_url_unique ON catalog_sources(source_url)`,
  `CREATE TABLE IF NOT EXISTS disc_rating_versions (
    id TEXT PRIMARY KEY, disc_mold_id TEXT NOT NULL, disc_variant_id TEXT, source_id TEXT NOT NULL,
    rating_system TEXT NOT NULL, speed REAL NOT NULL, glide REAL NOT NULL, turn REAL NOT NULL,
    fade REAL NOT NULL, effective_from TEXT NOT NULL, effective_to TEXT,
    is_current INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS disc_rating_versions_identity_unique
    ON disc_rating_versions(disc_mold_id, source_id, effective_from)`,
  `CREATE INDEX IF NOT EXISTS disc_rating_versions_current_idx
    ON disc_rating_versions(disc_mold_id, is_current)`,
  `CREATE TABLE IF NOT EXISTS plastic_families (
    id TEXT PRIMARY KEY, manufacturer_id TEXT NOT NULL, source_id TEXT NOT NULL,
    name TEXT NOT NULL, durability_class TEXT, grip_class TEXT, stability_note TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS plastic_families_manufacturer_name_unique
    ON plastic_families(manufacturer_id, name)`,
  `CREATE TABLE IF NOT EXISTS player_disc_profiles (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, player_disc_id TEXT NOT NULL,
    throw_type TEXT NOT NULL, sample_count INTEGER NOT NULL DEFAULT 0,
    typical_distance_feet REAL, success_rate REAL, observed_turn REAL, observed_fade REAL,
    confidence REAL NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS player_disc_profiles_disc_throw_unique
    ON player_disc_profiles(player_disc_id, throw_type)`,
  `CREATE INDEX IF NOT EXISTS player_disc_profiles_user_idx ON player_disc_profiles(user_id)`,
  `CREATE TABLE IF NOT EXISTS disc_observations (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, player_disc_id TEXT NOT NULL,
    ai_recommendation_id TEXT, throw_type TEXT NOT NULL, intended_shape TEXT,
    result TEXT NOT NULL, miss_direction TEXT, distance_feet INTEGER, wind_mph INTEGER,
    wind_direction TEXT, representative INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS disc_observations_disc_created_idx
    ON disc_observations(player_disc_id, created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS disc_observations_recommendation_user_unique
    ON disc_observations(ai_recommendation_id, user_id) WHERE ai_recommendation_id IS NOT NULL`,
] as const;

const postColumnSchemaStatements = [
  `CREATE UNIQUE INDEX IF NOT EXISTS manufacturers_slug_unique ON manufacturers(slug)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS disc_molds_manufacturer_name_unique ON disc_molds(manufacturer_id, name)`,
  `CREATE INDEX IF NOT EXISTS disc_molds_category_idx ON disc_molds(category)`,
  `CREATE INDEX IF NOT EXISTS disc_variants_mold_idx ON disc_variants(disc_mold_id)`,
  `CREATE INDEX IF NOT EXISTS player_discs_user_status_idx ON player_discs(user_id, status)`,
  `CREATE INDEX IF NOT EXISTS player_discs_mold_idx ON player_discs(disc_mold_id)`,
  `CREATE INDEX IF NOT EXISTS bags_user_active_idx ON bags(user_id, is_active)`,
  `CREATE INDEX IF NOT EXISTS bag_slots_bag_sort_idx ON bag_slots(bag_id, sort_order)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS bag_slots_bag_disc_unique ON bag_slots(bag_id, player_disc_id)`,
  `CREATE INDEX IF NOT EXISTS ai_sessions_user_feature_idx ON ai_sessions(user_id, feature)`,
  `CREATE INDEX IF NOT EXISTS ai_recommendations_user_created_idx ON ai_recommendations(user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS ai_feedback_recommendation_idx ON ai_feedback(ai_recommendation_id)`,
] as const;

const requiredColumns = {
  disc_molds: [
    ["slug", "TEXT"], ["pdga_certification_number", "TEXT"], ["approved_at", "TEXT"],
    ["max_weight_grams", "REAL"], ["diameter_cm", "REAL"], ["height_cm", "REAL"],
    ["rim_depth_cm", "REAL"], ["rim_thickness_cm", "REAL"],
    ["is_active", "INTEGER NOT NULL DEFAULT 1"], ["version", "INTEGER NOT NULL DEFAULT 1"],
  ],
  disc_variants: [
    ["plastic_family_id", "TEXT"], ["run_name", "TEXT"], ["source_id", "TEXT"],
    ["is_active", "INTEGER NOT NULL DEFAULT 1"], ["version", "INTEGER NOT NULL DEFAULT 1"],
  ],
  player_discs: [
    ["disc_mold_id", "TEXT"], ["rating_version_id", "TEXT"],
    ["manual_speed", "REAL"], ["manual_glide", "REAL"], ["manual_turn", "REAL"], ["manual_fade", "REAL"],
    ["wear_rating", "INTEGER NOT NULL DEFAULT 0"], ["dome_profile", "TEXT"], ["run_name", "TEXT"],
  ],
} as const;

export async function ensureBagSchema(): Promise<void> {
  if (!schemaInitialization) {
    schemaInitialization = initializeBagSchema().catch((error: unknown) => {
      schemaInitialization = null;
      throw error;
    });
  }
  await schemaInitialization;
}

async function initializeBagSchema(): Promise<void> {
  const database = getD1Database();
  await database.batch(schemaStatements.map((statement) => database.prepare(statement)));
  for (const [table, columns] of Object.entries(requiredColumns)) {
    const info = await database.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
    const existing = new Set(info.results.map((column) => column.name));
    const additions = columns
      .filter(([name]) => !existing.has(name))
      .map(([name, definition]) => database.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`));
    if (additions.length) await database.batch(additions);
  }
  await database.batch(postColumnSchemaStatements.map((statement) => database.prepare(statement)));
  await seedReviewedCatalog();
}

async function seedReviewedCatalog(): Promise<void> {
  const database = getD1Database();
  const statements: D1PreparedStatement[] = [];
  for (const record of catalogSeed.records) {
    const now = catalogSeed.reviewed_at;
    const ratingVersionId = ratingId(record.id);
    statements.push(
      database.prepare(
        `INSERT INTO catalog_sources
          (id, source_type, source_name, source_url, license_note, checked_at,
           is_authoritative, created_at, updated_at)
         VALUES (?, 'MANUFACTURER', ?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET source_name = excluded.source_name,
           source_url = excluded.source_url, license_note = excluded.license_note,
           checked_at = excluded.checked_at, updated_at = excluded.updated_at`,
      ).bind(record.source.id, record.source.name, record.source.url, record.source.license_note, record.source.checked_at, now, now),
      database.prepare(
        `INSERT INTO manufacturers (id, name, slug, website, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, slug = excluded.slug,
           website = excluded.website, updated_at = excluded.updated_at`,
      ).bind(record.manufacturer.id, record.manufacturer.name, record.manufacturer.slug, record.manufacturer.website, now, now),
      database.prepare(
        `INSERT INTO disc_molds
          (id, manufacturer_id, name, slug, category, speed, glide, turn, fade,
           approved_reference, is_active, created_at, updated_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 1)
         ON CONFLICT(id) DO UPDATE SET manufacturer_id = excluded.manufacturer_id,
           name = excluded.name, slug = excluded.slug, category = excluded.category,
           approved_reference = excluded.approved_reference, is_active = 1,
           updated_at = excluded.updated_at, version = disc_molds.version + 1`,
      ).bind(
        record.id, record.manufacturer.id, record.mold, record.slug, record.category,
        String(record.ratings.speed), String(record.ratings.glide), String(record.ratings.turn),
        String(record.ratings.fade), record.approved_reference, now, now,
      ),
      database.prepare(
        `UPDATE disc_rating_versions SET is_current = 0, effective_to = ?
         WHERE disc_mold_id = ? AND id <> ? AND is_current = 1`,
      ).bind(record.ratings.effective_from, record.id, ratingVersionId),
      database.prepare(
        `INSERT INTO disc_rating_versions
          (id, disc_mold_id, source_id, rating_system, speed, glide, turn, fade,
           effective_from, is_current, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
         ON CONFLICT(id) DO UPDATE SET is_current = 1, effective_to = NULL`,
      ).bind(
        ratingVersionId, record.id, record.source.id, record.ratings.system,
        record.ratings.speed, record.ratings.glide, record.ratings.turn, record.ratings.fade,
        record.ratings.effective_from, now,
      ),
    );
    for (const plastic of record.plastics) {
      const plasticId = `${record.manufacturer.id}:${slugify(plastic)}`;
      const variantId = `${record.id}:${slugify(plastic)}`;
      statements.push(
        database.prepare(
          `INSERT INTO plastic_families
            (id, manufacturer_id, source_id, name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(manufacturer_id, name) DO UPDATE SET
             source_id = excluded.source_id, updated_at = excluded.updated_at`,
        ).bind(plasticId, record.manufacturer.id, record.source.id, plastic, now, now),
        database.prepare(
          `INSERT INTO disc_variants
            (id, disc_mold_id, plastic, plastic_family_id, source_id,
             catalog_metadata_json, is_active, created_at, updated_at, version)
           VALUES (?, ?, ?, ?, ?, '{}', 1, ?, ?, 1)
           ON CONFLICT(id) DO UPDATE SET plastic = excluded.plastic,
             plastic_family_id = excluded.plastic_family_id, source_id = excluded.source_id,
             is_active = 1, updated_at = excluded.updated_at, version = disc_variants.version + 1`,
        ).bind(variantId, record.id, plastic, plasticId, record.source.id, now, now),
      );
    }
  }
  for (let start = 0; start < statements.length; start += 50) {
    await database.batch(statements.slice(start, start + 50));
  }
}

export async function listCatalogDiscs(query = ""): Promise<CatalogDisc[]> {
  await ensureBagSchema();
  const normalized = `%${query.trim().toLowerCase()}%`;
  const result = await getD1Database().prepare(
    `SELECT dm.id, m.name AS manufacturer, dm.name AS mold, dm.category,
      rv.speed, rv.glide, rv.turn, rv.fade, rv.id AS ratingVersionId,
      rv.rating_system AS ratingSystem, cs.source_name AS ratingSource,
      cs.source_url AS ratingSourceUrl, cs.checked_at AS checkedAt,
      dm.approved_reference AS approvedReference,
      GROUP_CONCAT(DISTINCT dv.plastic) AS plasticsCsv
     FROM disc_molds dm
     JOIN manufacturers m ON m.id = dm.manufacturer_id
     JOIN disc_rating_versions rv ON rv.disc_mold_id = dm.id AND rv.is_current = 1
     JOIN catalog_sources cs ON cs.id = rv.source_id
     LEFT JOIN disc_variants dv ON dv.disc_mold_id = dm.id AND dv.is_active = 1
     WHERE dm.is_active = 1 AND (? = '%%' OR lower(m.name || ' ' || dm.name) LIKE ?)
     GROUP BY dm.id, m.name, dm.name, dm.category, rv.speed, rv.glide, rv.turn,
       rv.fade, rv.id, rv.rating_system, cs.source_name, cs.source_url,
       cs.checked_at, dm.approved_reference
     ORDER BY m.name, dm.category, rv.speed, dm.name LIMIT 250`,
  ).bind(normalized, normalized).all<Record<string, unknown>>();
  return result.results.map((row) => ({
    id: String(row.id),
    manufacturer: String(row.manufacturer),
    mold: String(row.mold),
    category: String(row.category),
    speed: Number(row.speed), glide: Number(row.glide), turn: Number(row.turn), fade: Number(row.fade),
    plastics: String(row.plasticsCsv ?? "").split(",").filter(Boolean).sort(),
    ratingVersionId: String(row.ratingVersionId),
    ratingSystem: String(row.ratingSystem),
    ratingSource: String(row.ratingSource),
    ratingSourceUrl: String(row.ratingSourceUrl),
    checkedAt: String(row.checkedAt),
    approvedReference: row.approvedReference ? String(row.approvedReference) : null,
  }));
}

export async function listPlayerDiscs(user: AuthenticatedUser): Promise<PlayerDiscRecord[]> {
  await ensureBagSchema();
  const userId = await ensurePersistedUserId(user);
  await getOrCreatePrimaryBag(userId);
  const result = await getD1Database().prepare(
    `SELECT pd.id, pd.disc_mold_id AS catalogMoldId,
      pd.rating_version_id AS ratingVersionId,
      COALESCE(m.name, pd.manufacturer_name) AS manufacturerName,
      COALESCE(dm.name, pd.mold_name) AS moldName, dm.category,
      pd.plastic, pd.weight_grams AS weightGrams, pd.color, pd.nickname,
      COALESCE(pd.condition, 'GOOD') AS condition,
      pd.wear_rating AS wearRating, pd.dome_profile AS domeProfile,
      pd.run_name AS runName, pd.status, pd.notes,
      COALESCE(rv.speed, pd.manual_speed) AS speed,
      COALESCE(rv.glide, pd.manual_glide) AS glide,
      COALESCE(rv.turn, pd.manual_turn) AS turn,
      COALESCE(rv.fade, pd.manual_fade) AS fade,
      cs.source_name AS ratingSource, cs.source_url AS ratingSourceUrl,
      pd.created_at AS createdAt, pd.updated_at AS updatedAt, pd.version
     FROM player_discs pd
     LEFT JOIN disc_molds dm ON dm.id = pd.disc_mold_id
     LEFT JOIN manufacturers m ON m.id = dm.manufacturer_id
     LEFT JOIN disc_rating_versions rv ON rv.id = pd.rating_version_id
     LEFT JOIN catalog_sources cs ON cs.id = rv.source_id
     WHERE pd.user_id = ? AND pd.deleted_at IS NULL
     ORDER BY CASE pd.status WHEN 'IN_BAG' THEN 0 WHEN 'STORAGE' THEN 1 ELSE 2 END,
       COALESCE(rv.speed, pd.manual_speed), COALESCE(m.name, pd.manufacturer_name), COALESCE(dm.name, pd.mold_name)`,
  ).bind(userId).all<Record<string, unknown>>();
  const profiles = await listProfiles(userId);
  return result.results.map((row) => {
    const turn = Number(row.turn ?? 0);
    const fade = Number(row.fade ?? 0);
    return {
      id: String(row.id), catalogMoldId: nullableString(row.catalogMoldId),
      ratingVersionId: nullableString(row.ratingVersionId),
      manufacturerName: String(row.manufacturerName ?? "Unknown"), moldName: String(row.moldName),
      category: nullableString(row.category), plastic: nullableString(row.plastic),
      weightGrams: nullableNumber(row.weightGrams), color: nullableString(row.color),
      nickname: nullableString(row.nickname), condition: String(row.condition) as PlayerDiscRecord["condition"],
      wearRating: Number(row.wearRating ?? 0), domeProfile: nullableString(row.domeProfile) as PlayerDiscRecord["domeProfile"],
      runName: nullableString(row.runName), status: String(row.status) as PlayerDiscRecord["status"],
      notes: nullableString(row.notes), speed: Number(row.speed ?? 0), glide: Number(row.glide ?? 0),
      turn, fade, stability: stabilityFromRatings(turn, fade), ratingSource: nullableString(row.ratingSource),
      ratingSourceUrl: nullableString(row.ratingSourceUrl), profiles: profiles.get(String(row.id)) ?? [],
      createdAt: String(row.createdAt), updatedAt: String(row.updatedAt), version: Number(row.version),
    };
  });
}

export async function addPlayerDisc(user: AuthenticatedUser, input: PlayerDiscInput): Promise<PlayerDiscRecord> {
  await ensureBagSchema();
  const database = getD1Database();
  const userId = await ensurePersistedUserId(user);
  const bagId = await getOrCreatePrimaryBag(userId);
  const catalog = input.catalogMoldId ? await getCatalogIdentity(input.catalogMoldId) : null;
  if (input.catalogMoldId && !catalog) throw new BagConflictError("That catalog disc is no longer available.");
  const variantId = catalog && input.plastic ? await findVariantId(catalog.id, input.plastic) : null;
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const statements = [
    database.prepare(
      `INSERT INTO player_discs (
        id, user_id, disc_mold_id, disc_variant_id, rating_version_id,
        manufacturer_name, mold_name, manual_speed, manual_glide, manual_turn, manual_fade,
        plastic, weight_grams, color, nickname, condition, wear_rating, dome_profile,
        run_name, status, notes, created_at, updated_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    ).bind(
      id, userId, catalog?.id ?? null, variantId, catalog?.ratingVersionId ?? null,
      catalog?.manufacturer ?? input.manufacturerName, catalog?.mold ?? input.moldName,
      catalog ? null : input.manualSpeed, catalog ? null : input.manualGlide,
      catalog ? null : input.manualTurn, catalog ? null : input.manualFade,
      input.plastic, input.weightGrams, input.color, input.nickname, input.condition,
      input.wearRating, input.domeProfile, input.runName, input.status, input.notes,
      timestamp, timestamp,
    ),
    auditStatement(database, userId, "PLAYER_DISC_ADDED", "player_disc", id, timestamp),
  ];
  if (input.status === "IN_BAG") {
    statements.push(database.prepare(
      `INSERT INTO bag_slots (id, bag_id, player_disc_id, category, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(crypto.randomUUID(), bagId, id, catalog?.category ?? null, await nextBagSortOrder(bagId), timestamp));
  }
  await database.batch(statements);
  return requirePlayerDisc(user, id);
}

export async function updatePlayerDisc(user: AuthenticatedUser, discId: string, input: PlayerDiscInput): Promise<PlayerDiscRecord> {
  const current = await requirePlayerDisc(user, discId);
  if (input.version !== current.version) throw new BagConflictError();
  const database = getD1Database();
  const userId = await ensurePersistedUserId(user);
  const catalog = input.catalogMoldId ? await getCatalogIdentity(input.catalogMoldId) : null;
  if (input.catalogMoldId && !catalog) throw new BagConflictError("That catalog disc is no longer available.");
  const variantId = catalog && input.plastic ? await findVariantId(catalog.id, input.plastic) : null;
  const timestamp = new Date().toISOString();
  const nextVersion = current.version + 1;
  const bagId = await getOrCreatePrimaryBag(userId);
  const statements: D1PreparedStatement[] = [database.prepare(
    `UPDATE player_discs SET disc_mold_id = ?, disc_variant_id = ?, rating_version_id = ?,
      manufacturer_name = ?, mold_name = ?, manual_speed = ?, manual_glide = ?, manual_turn = ?, manual_fade = ?,
      plastic = ?, weight_grams = ?, color = ?, nickname = ?, condition = ?, wear_rating = ?,
      dome_profile = ?, run_name = ?, status = ?, notes = ?, updated_at = ?, version = version + 1
     WHERE id = ? AND user_id = ? AND version = ? AND deleted_at IS NULL`,
  ).bind(
    catalog?.id ?? null, variantId, catalog?.ratingVersionId ?? null,
    catalog?.manufacturer ?? input.manufacturerName, catalog?.mold ?? input.moldName,
    catalog ? null : input.manualSpeed, catalog ? null : input.manualGlide,
    catalog ? null : input.manualTurn, catalog ? null : input.manualFade,
    input.plastic, input.weightGrams, input.color, input.nickname, input.condition,
    input.wearRating, input.domeProfile, input.runName, input.status, input.notes,
    timestamp, discId, userId, current.version,
  )];
  if (input.status === "IN_BAG") {
    statements.push(database.prepare(
      `INSERT OR IGNORE INTO bag_slots (id, bag_id, player_disc_id, category, sort_order, created_at)
       SELECT ?, ?, ?, ?, ?, ?
       WHERE EXISTS (SELECT 1 FROM player_discs WHERE id = ? AND user_id = ? AND version = ?)`,
    ).bind(
      crypto.randomUUID(), bagId, discId, catalog?.category ?? current.category,
      await nextBagSortOrder(bagId), timestamp, discId, userId, nextVersion,
    ));
  } else {
    statements.push(database.prepare(
      `DELETE FROM bag_slots WHERE bag_id = ? AND player_disc_id = ?
       AND EXISTS (SELECT 1 FROM player_discs WHERE id = ? AND user_id = ? AND version = ?)`,
    ).bind(bagId, discId, discId, userId, nextVersion));
  }
  statements.push(conditionalAuditStatement(database, userId, "PLAYER_DISC_UPDATED", "player_disc", discId, nextVersion, timestamp));
  const results = await database.batch(statements);
  if (!results[0]?.meta.changes) throw new BagConflictError();
  return requirePlayerDisc(user, discId);
}

export async function removePlayerDisc(user: AuthenticatedUser, discId: string, version: number): Promise<void> {
  const current = await requirePlayerDisc(user, discId);
  if (version !== current.version) throw new BagConflictError();
  const database = getD1Database();
  const userId = await ensurePersistedUserId(user);
  const timestamp = new Date().toISOString();
  const nextVersion = version + 1;
  const results = await database.batch([
    database.prepare(
    `UPDATE player_discs SET deleted_at = ?, updated_at = ?, version = version + 1
     WHERE id = ? AND user_id = ? AND version = ? AND deleted_at IS NULL`,
    ).bind(timestamp, timestamp, discId, userId, version),
    database.prepare(
      `DELETE FROM bag_slots WHERE player_disc_id = ?
       AND EXISTS (SELECT 1 FROM player_discs WHERE id = ? AND user_id = ? AND version = ? AND deleted_at IS NOT NULL)`,
    ).bind(discId, discId, userId, nextVersion),
    conditionalAuditStatement(database, userId, "PLAYER_DISC_REMOVED", "player_disc", discId, nextVersion, timestamp),
  ]);
  if (!results[0]?.meta.changes) throw new BagConflictError();
}

export async function createCaddieRecommendation(
  user: AuthenticatedUser,
  input: CaddieRequestInput,
): Promise<{ id: string; recommendation: ShotRecommendation }> {
  await ensureBagSchema();
  const userId = await ensurePersistedUserId(user);
  const discs = await listPlayerDiscs(user);
  const caddieDiscs = discs.filter((disc) => disc.status === "IN_BAG").map((disc) => toCaddieDisc(disc, input.throwType));
  const started = Date.now();
  const recommendation = recommendShot({ ...input, discs: caddieDiscs });
  const sessionId = crypto.randomUUID();
  const recommendationId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  await getD1Database().batch([
    getD1Database().prepare(
      `INSERT INTO ai_sessions
        (id, user_id, feature, provider, model_version, prompt_version,
         output_schema_version, status, started_at, completed_at, latency_ms,
         usage_json, cost_micros, safety_result)
       VALUES (?, ?, 'AI_CADDIE', 'RULES_ENGINE', ?, 'caddie-2', '2.0',
         'COMPLETED', ?, ?, ?, '{}', 0, 'PASSED')`,
    ).bind(sessionId, userId, CADDIE_MODEL_VERSION, timestamp, timestamp, Date.now() - started),
    getD1Database().prepare(
      `INSERT INTO ai_recommendations
        (id, ai_session_id, user_id, recommendation_type, input_summary_json,
         output_json, confidence, created_at)
       VALUES (?, ?, ?, 'SHOT', ?, ?, ?, ?)`,
    ).bind(
      recommendationId, sessionId, userId, JSON.stringify(input), JSON.stringify(recommendation),
      JSON.stringify({ score: recommendation.confidence, label: recommendation.confidenceLabel }), timestamp,
    ),
    auditStatement(getD1Database(), userId, "CADDIE_RECOMMENDATION_CREATED", "ai_recommendation", recommendationId, timestamp),
  ]);
  return { id: recommendationId, recommendation };
}

export async function recordCaddieFeedback(
  user: AuthenticatedUser,
  recommendationId: string,
  input: CaddieFeedbackInput,
): Promise<DiscProfile | null> {
  await ensureBagSchema();
  const database = getD1Database();
  const userId = await ensurePersistedUserId(user);
  const recommendation = await database.prepare(
    `SELECT output_json AS outputJson FROM ai_recommendations WHERE id = ? AND user_id = ? LIMIT 1`,
  ).bind(recommendationId, userId).first<{ outputJson: string }>();
  if (!recommendation) throw new BagConflictError("That recommendation is no longer available.");
  const output = safeObject(recommendation.outputJson);
  if (output.primaryDiscId !== input.playerDiscId) throw new BagConflictError("Feedback must reference the recommended owned disc.");
  const disc = await requirePlayerDisc(user, input.playerDiscId);
  const existingObservation = await database.prepare(
    "SELECT id FROM disc_observations WHERE ai_recommendation_id = ? AND user_id = ? LIMIT 1",
  ).bind(recommendationId, userId).first();
  if (existingObservation) throw new BagConflictError("Feedback was already recorded for this recommendation.");

  const timestamp = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    database.prepare(
      `INSERT INTO ai_feedback
        (id, ai_recommendation_id, user_id, rating, correction_json, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(), recommendationId, userId,
      input.result === "SUCCESS" ? "HELPFUL" : "NEEDS_ADJUSTMENT",
      JSON.stringify({ flightAdjustment: input.flightAdjustment, missDirection: input.missDirection }),
      input.comment, timestamp,
    ),
    database.prepare(
      `INSERT INTO disc_observations
        (id, user_id, player_disc_id, ai_recommendation_id, throw_type, intended_shape,
         result, miss_direction, distance_feet, wind_mph, wind_direction, representative, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(), userId, input.playerDiscId, recommendationId, input.throwType,
      input.intendedShape, input.result, input.missDirection, input.distanceFeet,
      input.windMph, input.windDirection, input.representative ? 1 : 0, timestamp,
    ),
    auditStatement(database, userId, "CADDIE_FEEDBACK_RECORDED", "ai_recommendation", recommendationId, timestamp),
  ];

  let nextProfile: DiscProfile | null = null;
  if (input.representative) {
    const current = disc.profiles.find((profile) => profile.throwType === input.throwType) ?? null;
    nextProfile = nextDiscProfile(current, disc, input);
    statements.push(database.prepare(
      `INSERT INTO player_disc_profiles
        (id, user_id, player_disc_id, throw_type, sample_count, typical_distance_feet,
         success_rate, observed_turn, observed_fade, confidence, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT(player_disc_id, throw_type) DO UPDATE SET
         sample_count = excluded.sample_count,
         typical_distance_feet = excluded.typical_distance_feet,
         success_rate = excluded.success_rate,
         observed_turn = excluded.observed_turn,
         observed_fade = excluded.observed_fade,
         confidence = excluded.confidence,
         updated_at = excluded.updated_at,
         version = player_disc_profiles.version + 1`,
    ).bind(
      crypto.randomUUID(), userId, input.playerDiscId, nextProfile.throwType,
      nextProfile.sampleCount, nextProfile.typicalDistanceFeet, nextProfile.successRate,
      nextProfile.observedTurn, nextProfile.observedFade, nextProfile.confidence, timestamp,
    ));
  }
  await database.batch(statements);
  return nextProfile;
}

async function listProfiles(userId: string): Promise<Map<string, DiscProfile[]>> {
  const result = await getD1Database().prepare(
    `SELECT player_disc_id AS playerDiscId, throw_type AS throwType,
      sample_count AS sampleCount, typical_distance_feet AS typicalDistanceFeet,
      success_rate AS successRate, observed_turn AS observedTurn,
      observed_fade AS observedFade, confidence
     FROM player_disc_profiles WHERE user_id = ?`,
  ).bind(userId).all<Record<string, unknown>>();
  const profiles = new Map<string, DiscProfile[]>();
  for (const row of result.results) {
    const profile: DiscProfile = {
      throwType: String(row.throwType) as DiscProfile["throwType"],
      sampleCount: Number(row.sampleCount), typicalDistanceFeet: nullableNumber(row.typicalDistanceFeet),
      successRate: nullableNumber(row.successRate), observedTurn: nullableNumber(row.observedTurn),
      observedFade: nullableNumber(row.observedFade), confidence: Number(row.confidence),
    };
    const id = String(row.playerDiscId);
    profiles.set(id, [...(profiles.get(id) ?? []), profile]);
  }
  return profiles;
}

async function getCatalogIdentity(id: string): Promise<CatalogDisc | null> {
  const matches = await listCatalogDiscs();
  return matches.find((disc) => disc.id === id) ?? null;
}

async function findVariantId(moldId: string, plastic: string): Promise<string | null> {
  const row = await getD1Database().prepare(
    `SELECT id FROM disc_variants WHERE disc_mold_id = ? AND lower(plastic) = lower(?) AND is_active = 1 LIMIT 1`,
  ).bind(moldId, plastic).first<{ id: string }>();
  return row?.id ?? null;
}

async function getOrCreatePrimaryBag(userId: string): Promise<string> {
  const existing = await getD1Database().prepare(
    "SELECT id FROM bags WHERE user_id = ? AND is_active = 1 ORDER BY created_at LIMIT 1",
  ).bind(userId).first<{ id: string }>();
  if (existing) return existing.id;
  // A stable primary-bag ID makes concurrent first loads converge on one row.
  const id = `primary-bag:${userId}`;
  const timestamp = new Date().toISOString();
  await getD1Database().prepare(
    `INSERT OR IGNORE INTO bags (id, user_id, name, bag_type, is_active, created_at, updated_at)
     VALUES (?, ?, 'Main bag', 'PRIMARY', 1, ?, ?)`,
  ).bind(id, userId, timestamp, timestamp).run();
  const persisted = await getD1Database().prepare(
    "SELECT id FROM bags WHERE user_id = ? AND is_active = 1 ORDER BY created_at LIMIT 1",
  ).bind(userId).first<{ id: string }>();
  if (!persisted) throw new Error("The primary bag could not be initialized.");
  return persisted.id;
}

async function nextBagSortOrder(bagId: string): Promise<number> {
  const row = await getD1Database().prepare(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextOrder FROM bag_slots WHERE bag_id = ?",
  ).bind(bagId).first<{ nextOrder: number }>();
  return row?.nextOrder ?? 0;
}

async function requirePlayerDisc(user: AuthenticatedUser, discId: string): Promise<PlayerDiscRecord> {
  const discs = await listPlayerDiscs(user);
  const disc = discs.find((candidate) => candidate.id === discId);
  if (!disc) throw new BagConflictError("That disc was not found in your collection.");
  return disc;
}

function toCaddieDisc(disc: PlayerDiscRecord, throwType: "BACKHAND" | "FOREHAND"): PlayerDisc {
  const profile = disc.profiles.find((candidate) => candidate.throwType === throwType);
  return {
    id: disc.id, manufacturer: disc.manufacturerName, mold: disc.moldName,
    category: disc.category ?? undefined, plastic: disc.plastic ?? undefined,
    weightGrams: disc.weightGrams ?? undefined, color: disc.color ?? undefined,
    nickname: disc.nickname ?? undefined, condition: disc.condition,
    wearRating: disc.wearRating, runName: disc.runName ?? undefined,
    domeProfile: disc.domeProfile ?? undefined, speed: disc.speed, glide: disc.glide,
    turn: disc.turn, fade: disc.fade, stability: disc.stability, inBag: disc.status === "IN_BAG",
    ratingSource: disc.ratingSource ?? undefined, ratingSourceUrl: disc.ratingSourceUrl ?? undefined,
    ratingVersionId: disc.ratingVersionId ?? undefined,
    observedDistanceFeet: profile?.typicalDistanceFeet ?? undefined,
    observedTurn: profile?.observedTurn ?? undefined, observedFade: profile?.observedFade ?? undefined,
    reliability: profile?.successRate ?? undefined, sampleCount: profile?.sampleCount ?? 0,
    profileConfidence: profile?.confidence ?? 0,
  };
}

function nextDiscProfile(current: DiscProfile | null, disc: PlayerDiscRecord, input: CaddieFeedbackInput): DiscProfile {
  const previousCount = current?.sampleCount ?? 0;
  const sampleCount = previousCount + 1;
  const typicalDistanceFeet = input.distanceFeet == null
    ? current?.typicalDistanceFeet ?? null
    : runningAverage(current?.typicalDistanceFeet, previousCount, input.distanceFeet);
  const successValue = input.result === "SUCCESS" ? 1 : 0;
  const successRate = runningAverage(current?.successRate, previousCount, successValue);
  const adjustment = input.flightAdjustment === "MORE_UNDERSTABLE"
    ? { turn: disc.turn - 0.75, fade: Math.max(0, disc.fade - 0.5) }
    : input.flightAdjustment === "MORE_OVERSTABLE"
      ? { turn: Math.min(2, disc.turn + 0.5), fade: Math.min(6, disc.fade + 0.75) }
      : { turn: disc.turn, fade: disc.fade };
  return {
    throwType: input.throwType,
    sampleCount,
    typicalDistanceFeet,
    successRate,
    observedTurn: runningAverage(current?.observedTurn, previousCount, adjustment.turn),
    observedFade: runningAverage(current?.observedFade, previousCount, adjustment.fade),
    confidence: Math.round(Math.min(0.95, sampleCount / 12) * 100) / 100,
  };
}

function runningAverage(previous: number | null | undefined, previousCount: number, next: number): number {
  if (previous == null || previousCount === 0) return next;
  return Math.round(((previous * previousCount + next) / (previousCount + 1)) * 100) / 100;
}

function stabilityFromRatings(turn: number, fade: number): DiscStability {
  const score = fade + turn * 0.7;
  return score >= 2.25 ? "OVERSTABLE" : score <= 0.35 ? "UNDERSTABLE" : "STABLE";
}

function ratingId(moldId: string): string {
  return moldId.replace("91100000", "91400000");
}

function slugify(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}

function auditStatement(
  database: D1Database,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  createdAt: string,
): D1PreparedStatement {
  return database.prepare(
    `INSERT INTO audit_logs (id, actor_user_id, action, resource_type, resource_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(crypto.randomUUID(), userId, action, resourceType, resourceId, createdAt);
}

function conditionalAuditStatement(
  database: D1Database,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  playerDiscVersion: number,
  createdAt: string,
): D1PreparedStatement {
  return database.prepare(
    `INSERT INTO audit_logs (id, actor_user_id, action, resource_type, resource_id, created_at)
     SELECT ?, ?, ?, ?, ?, ?
     WHERE EXISTS (SELECT 1 FROM player_discs WHERE id = ? AND user_id = ? AND version = ?)`,
  ).bind(
    crypto.randomUUID(), userId, action, resourceType, resourceId, createdAt,
    resourceId, userId, playerDiscVersion,
  );
}

function safeObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length ? value : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : value == null ? null : Number(value);
}
