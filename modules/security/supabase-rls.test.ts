import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Supabase row-level security migration", () => {
  const migration = readFileSync("packages/database/migrations/0004_supabase_rls.sql", "utf8");
  it("enables RLS on private identity, claim, round, media, and audit tables", () => {
    for (const table of ["users", "course_claim_evidence", "rounds", "hole_highlight_videos", "audit_logs", "email_verification_tokens"]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
  });
  it("exposes only published and sanitized public records", () => {
    expect(migration).toContain("is_published = true");
    expect(migration).toContain("sanitization_status = 'CLEAN'");
    expect(migration).toContain("revoke all on public.email_verification_tokens");
  });
});
