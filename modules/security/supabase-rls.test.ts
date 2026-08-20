import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Supabase row-level security migration", () => {
  const migration = readFileSync("packages/database/migrations/0004_supabase_rls.sql", "utf8");
  const communityMigration = readFileSync("packages/database/migrations/0006_community_chat.sql", "utf8");
  it("enables RLS on private identity, claim, round, media, and audit tables", () => {
    for (const table of ["users", "course_claim_evidence", "rounds", "hole_highlight_videos", "audit_logs", "email_verification_tokens"]) {
      expect(migration).toContain(`alter table if exists public.${table} enable row level security`);
    }
  });
  it("exposes only published and sanitized public records", () => {
    expect(migration).toContain("published_at is not null");
    expect(migration).toContain("sanitization_status = 'CLEAN'");
    expect(migration).toContain("revoke all on public.email_verification_tokens");
  });
  it("uses a security-definer membership helper instead of a recursive membership policy", () => {
    expect(communityMigration).toContain("function public.is_community_conversation_member");
    expect(communityMigration).toContain("using (public.is_community_conversation_member(conversation_id))");
    expect(communityMigration).not.toContain("from public.conversation_members self where self.conversation_id = conversation_id");
    expect(communityMigration).toContain("revoke insert, update, delete on public.conversations");
    expect(communityMigration).toContain("revoke all on public.hosted_signup_intents");
    expect(communityMigration).toContain("revoke all on public.password_recovery_intents");
  });
});
