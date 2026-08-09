import { getD1Database } from "@/db/runtime";
import { ensurePersistedUserId } from "@/modules/auth/account-repository";
import type { AuthenticatedUser } from "@/modules/auth/types";
import { listPlayerDiscs } from "@/modules/bags/bag-repository";
import { buildCaddieSystemInstructions, CADDIE_KNOWLEDGE_VERSION } from "./knowledge";
import { generateCaddieChat, type CaddieChatTurn } from "@/packages/ai/src/caddie-chat";

export type StoredCaddieMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider: string | null;
  confidence: string | null;
  createdAt: string;
};

let schemaPromise: Promise<void> | null = null;
const schema = [
  `CREATE TABLE IF NOT EXISTS caddie_conversations (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
    knowledge_version TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS caddie_conversations_user_updated_idx ON caddie_conversations(user_id, updated_at)`,
  `CREATE TABLE IF NOT EXISTS caddie_messages (
    id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, user_id TEXT NOT NULL,
    role TEXT NOT NULL, content TEXT NOT NULL, provider TEXT, model_version TEXT,
    confidence TEXT, safety_result TEXT, created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS caddie_messages_conversation_created_idx ON caddie_messages(conversation_id, created_at)`,
] as const;

export async function listCaddieMessages(user: AuthenticatedUser, conversationId?: string | null): Promise<{ conversationId: string | null; messages: StoredCaddieMessage[] }> {
  await ensureSchema();
  const userId = await ensurePersistedUserId(user);
  const database = getD1Database();
  let selectedId = conversationId ?? null;
  if (!selectedId) {
    selectedId = (await database.prepare("SELECT id FROM caddie_conversations WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1").bind(userId).first<{ id: string }>())?.id ?? null;
  }
  if (!selectedId) return { conversationId: null, messages: [] };
  const owner = await database.prepare("SELECT id FROM caddie_conversations WHERE id = ? AND user_id = ? AND deleted_at IS NULL").bind(selectedId, userId).first();
  if (!owner) return { conversationId: null, messages: [] };
  const result = await database.prepare(
    "SELECT id, role, content, provider, confidence, created_at AS createdAt FROM caddie_messages WHERE conversation_id = ? AND user_id = ? ORDER BY created_at ASC LIMIT 80",
  ).bind(selectedId, userId).all<Record<string, unknown>>();
  return { conversationId: selectedId, messages: result.results.map(mapMessage) };
}

export async function sendCaddieMessage(user: AuthenticatedUser, message: string, requestedConversationId?: string | null) {
  await ensureSchema();
  const userId = await ensurePersistedUserId(user);
  const database = getD1Database();
  const now = new Date().toISOString();
  let conversationId = requestedConversationId ?? null;
  if (conversationId) {
    const owner = await database.prepare("SELECT id FROM caddie_conversations WHERE id = ? AND user_id = ? AND deleted_at IS NULL").bind(conversationId, userId).first();
    if (!owner) conversationId = null;
  }
  if (!conversationId) {
    conversationId = crypto.randomUUID();
    await database.prepare(
      "INSERT INTO caddie_conversations (id, user_id, title, knowledge_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind(conversationId, userId, message.slice(0, 72), CADDIE_KNOWLEDGE_VERSION, now, now).run();
  }

  const existing = await listCaddieMessages(user, conversationId);
  const discs = await listPlayerDiscs(user);
  const active = discs.filter((disc) => disc.status === "IN_BAG");
  const bagSummary = active.slice(0, 30).map((disc) => `${disc.manufacturerName} ${disc.moldName} (${disc.speed}/${disc.glide}/${disc.turn}/${disc.fade}${disc.weightGrams ? `, ${disc.weightGrams}g` : ""}, wear ${disc.wearRating}/10)`).join("; ");
  const safetyIdentifier = await privacyHash(userId);
  const history: CaddieChatTurn[] = existing.messages.map(({ role, content }) => ({ role, content }));
  const generated = await generateCaddieChat({ message, instructions: buildCaddieSystemInstructions(bagSummary), bagSummary, history, safetyIdentifier });
  const userMessage: StoredCaddieMessage = { id: crypto.randomUUID(), role: "user", content: message, provider: null, confidence: null, createdAt: now };
  const assistantMessage: StoredCaddieMessage = { id: crypto.randomUUID(), role: "assistant", content: generated.answer, provider: generated.provider, confidence: generated.confidence, createdAt: new Date().toISOString() };
  await database.batch([
    database.prepare("INSERT INTO caddie_messages (id, conversation_id, user_id, role, content, created_at) VALUES (?, ?, ?, 'user', ?, ?)").bind(userMessage.id, conversationId, userId, message, userMessage.createdAt),
    database.prepare("INSERT INTO caddie_messages (id, conversation_id, user_id, role, content, provider, model_version, confidence, safety_result, created_at) VALUES (?, ?, ?, 'assistant', ?, ?, ?, ?, ?, ?)").bind(assistantMessage.id, conversationId, userId, generated.answer, generated.provider, generated.model, generated.confidence, generated.safetyResult, assistantMessage.createdAt),
    database.prepare("UPDATE caddie_conversations SET updated_at = ? WHERE id = ? AND user_id = ?").bind(assistantMessage.createdAt, conversationId, userId),
  ]);
  return { conversationId, messages: [userMessage, assistantMessage], mode: generated.provider === "OPENAI" ? "AI" : "FIELD_GUIDE" };
}

export async function buildRealtimeInstructions(user: AuthenticatedUser): Promise<{ instructions: string; safetyIdentifier: string }> {
  const userId = await ensurePersistedUserId(user);
  const discs = await listPlayerDiscs(user);
  const bagSummary = discs.filter((disc) => disc.status === "IN_BAG").slice(0, 30).map((disc) => `${disc.manufacturerName} ${disc.moldName} ${disc.speed}/${disc.glide}/${disc.turn}/${disc.fade}`).join("; ");
  return { instructions: `${buildCaddieSystemInstructions(bagSummary)}\nKeep spoken answers under 25 seconds unless the player asks for detail. Ask one question at a time.`, safetyIdentifier: await privacyHash(userId) };
}

async function ensureSchema() {
  if (!schemaPromise) schemaPromise = getD1Database().batch(schema.map((statement) => getD1Database().prepare(statement))).then(() => undefined).catch((error) => { schemaPromise = null; throw error; });
  await schemaPromise;
}

async function privacyHash(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function mapMessage(row: Record<string, unknown>): StoredCaddieMessage {
  return { id: String(row.id), role: row.role === "assistant" ? "assistant" : "user", content: String(row.content), provider: row.provider ? String(row.provider) : null, confidence: row.confidence ? String(row.confidence) : null, createdAt: String(row.createdAt) };
}
