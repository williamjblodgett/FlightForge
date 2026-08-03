import { describe, expect, it } from "vitest";
import { applyImport, rollbackImport } from "./import-session";

describe("course import apply and rollback", () => {
  it("restores updates and removes created records", () => {
    const existing = new Map([["course-1", { name: "Before" }]]);
    const incoming = new Map([
      ["course-1", { name: "After" }],
      ["course-2", { name: "Created" }],
    ]);
    const applied = applyImport(existing, incoming, "batch-1", new Date("2026-08-03T12:00:00Z"));
    expect(applied.records.get("course-1")?.name).toBe("After");
    expect(applied.records.has("course-2")).toBe(true);

    const rolledBack = rollbackImport(applied.records, applied.batch);
    expect(rolledBack.get("course-1")?.name).toBe("Before");
    expect(rolledBack.has("course-2")).toBe(false);
  });
});
