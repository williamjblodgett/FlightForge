import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

describe("community D1 migration", () => {
  it("creates the adult gate, curated channels, indexes, and idempotent message constraint", () => {
    const database = new DatabaseSync(":memory:");
    const directory = new URL("../../drizzle/", import.meta.url);
    for (const file of readdirSync(directory).filter((name) => /^\d{4}_.+\.sql$/u.test(name)).sort()) {
      database.exec(readFileSync(new URL(file, directory), "utf8").replaceAll("--> statement-breakpoint", ""));
    }

    const tables = new Set(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
    expect(tables).toContain("community_user_status");
    expect(tables).toContain("hosted_signup_intents");
    expect(tables).toContain("password_recovery_intents");
    expect(database.prepare("SELECT count(*) AS count FROM conversations WHERE conversation_type = 'PUBLIC_CHANNEL'").get()?.count).toBe(7);
    expect(database.prepare("SELECT subject FROM conversations WHERE context_type = 'REGION' AND context_id = 'new-england'").get()?.subject).toBe("New England Clubhouse");
    expect(database.prepare("SELECT enabled FROM feature_flags WHERE key = 'community_chat'").get()?.enabled).toBe(1);

    const messageColumns = new Set(database.prepare("PRAGMA table_info(messages)").all().map((row) => row.name));
    expect(messageColumns.has("client_message_id")).toBe(true);
    expect(messageColumns.has("moderation_reason")).toBe(true);

    const now = new Date().toISOString();
    database.prepare("INSERT INTO users (id,email,display_name,status,is_test_account,email_verified_at,created_at,updated_at,version) VALUES (?,?,?,?,?,?,?,?,?)")
      .run("u1", "u1@example.com", "One", "ACTIVE", 0, now, now, now, 1);
    database.prepare("INSERT INTO messages (id,conversation_id,sender_user_id,body,client_message_id,moderation_status,created_at,version) VALUES (?,?,?,?,?,?,?,?)")
      .run("m1", "96cc0000-0000-4000-8000-000000000001", "u1", "hello", "client-key-123456789", "PUBLISHED", now, 1);
    expect(() => database.prepare("INSERT INTO messages (id,conversation_id,sender_user_id,body,client_message_id,moderation_status,created_at,version) VALUES (?,?,?,?,?,?,?,?)")
      .run("m2", "96cc0000-0000-4000-8000-000000000001", "u1", "duplicate", "client-key-123456789", "PUBLISHED", now, 1)).toThrow();
    database.close();
  });
});
