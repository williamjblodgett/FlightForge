import { describe, expect, it } from "vitest";
import { ClaimEvidenceError, validateClaimEvidence } from "./claim-evidence-validation";

describe("claim evidence validation", () => {
  it("accepts a matching PDF name, MIME type, and signature", async () => {
    const file = new File(
      [new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])],
      "operator-proof.pdf",
      { type: "application/pdf" },
    );
    const result = await validateClaimEvidence(file);
    expect(result.extension).toBe("pdf");
    expect(result.contentType).toBe("application/pdf");
  });

  it("rejects MIME, extension, and signature mismatches", async () => {
    const disguised = new File(
      [new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])],
      "operator-proof.png",
      { type: "image/png" },
    );
    await expect(validateClaimEvidence(disguised)).rejects.toBeInstanceOf(ClaimEvidenceError);
  });

  it("rejects an executable payload even when its MIME label claims PDF", async () => {
    const executable = new File(
      [new Uint8Array([0x4d, 0x5a, 0x90, 0x00])],
      "operator-proof.pdf",
      { type: "application/pdf" },
    );
    await expect(validateClaimEvidence(executable)).rejects.toThrow("valid file signature");
  });
});
