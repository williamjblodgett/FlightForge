import catalog from "@/data/import/disc-catalog.reviewed.json";
import { describe, expect, it } from "vitest";
import { discCatalogImportSchema } from "./catalog-validation";

describe("reviewed disc catalog", () => {
  it("validates every sourced starter record", () => {
    const result = discCatalogImportSchema.parse(catalog);
    expect(result.records.length).toBeGreaterThanOrEqual(12);
    expect(result.records.every((record) => record.source.url.startsWith("https://"))).toBe(true);
    expect(result.records.every((record) => record.source.checked_at)).toBe(true);
  });

  it("rejects duplicate manufacturer and mold identities", () => {
    const result = discCatalogImportSchema.safeParse({
      ...catalog,
      records: [...catalog.records, { ...catalog.records[0], id: "00000000-0000-4000-8000-00000000ffff" }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.message.includes("Duplicate manufacturer and mold identity"))).toBe(true);
  });
});
