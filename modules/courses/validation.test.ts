import { describe, expect, it } from "vitest";
import seedBatch from "@/data/import/maine-courses.reviewed.json";
import { courseClaimSchema, courseImportBatchSchema } from "./validation";

describe("course validation", () => {
  it("accepts the reviewed Maine JSON import contract", () => {
    const result = courseImportBatchSchema.safeParse(seedBatch);
    expect(result.success).toBe(true);
  });

  it("rejects short claim explanations and malformed business contacts", () => {
    const result = courseClaimSchema.safeParse({
      courseId: "20000000-0000-4000-8000-000000000001",
      applicantName: "A",
      applicantRole: "Owner",
      businessEmail: "not-an-email",
      businessPhone: "12",
      website: "",
      explanation: "Too short",
    });
    expect(result.success).toBe(false);
  });
});
