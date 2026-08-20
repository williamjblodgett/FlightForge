import { getD1Database } from "@/db/runtime";

export const productionFeatureKeys = ["digital_bag", "ai_caddie", "event_publishing", "camera_coach", "community_chat"] as const;
export type ProductionFeatureKey = (typeof productionFeatureKeys)[number];

const descriptions: Record<ProductionFeatureKey, string> = {
  digital_bag: "Persistent physical disc inventory and sourced catalog",
  ai_caddie: "Explainable owned-disc recommendation rules engine",
  event_publishing: "Coordinator-owned event draft and publication workflow",
  camera_coach: "Private guided throw capture, evidence-based coaching, and GPS rangefinding",
  community_chat: "Adult community channels and private player messaging",
};

let featureInitialization: Promise<void> | null = null;

async function ensureProductionFeatureFlags(): Promise<void> {
  if (!featureInitialization) {
    const database = getD1Database();
    const timestamp = new Date().toISOString();
    featureInitialization = database.batch([
      database.prepare(
        `CREATE TABLE IF NOT EXISTS feature_flags (
          key TEXT PRIMARY KEY, description TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0,
          rules_json TEXT, updated_at TEXT NOT NULL, updated_by TEXT
        )`,
      ),
      ...productionFeatureKeys.map((key) => database.prepare(
        `INSERT OR IGNORE INTO feature_flags (key, description, enabled, updated_at)
         VALUES (?, ?, 1, ?)`,
      ).bind(key, descriptions[key], timestamp)),
    ]).then(() => undefined).catch((error: unknown) => {
      featureInitialization = null;
      throw error;
    });
  }
  await featureInitialization;
}

/** Runtime flags fail closed so an unavailable configuration store cannot expose writes. */
export async function isFeatureEnabled(key: ProductionFeatureKey): Promise<boolean> {
  try {
    await ensureProductionFeatureFlags();
    const row = await getD1Database().prepare(
      "SELECT enabled FROM feature_flags WHERE key = ? LIMIT 1",
    ).bind(key).first<{ enabled: number | boolean }>();
    return row?.enabled === true || Number(row?.enabled) === 1;
  } catch {
    return false;
  }
}
