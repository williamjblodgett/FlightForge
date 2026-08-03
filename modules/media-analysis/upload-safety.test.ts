import { describe, expect, it } from "vitest";
import { evaluateMediaUpload } from "./upload-safety";

describe("media upload safety", () => {
  it("accepts only consented media into quarantine", () => {
    const result = evaluateMediaUpload({
      fileName: "side-view.mp4",
      mimeType: "video/mp4",
      sizeBytes: 20 * 1024 * 1024,
      durationSeconds: 18,
      consentToAnalyze: true,
      userIsMinor: false,
      guardianConsent: false,
    });
    expect(result).toMatchObject({ accepted: true, quarantineRequired: true });
  });

  it("rejects long video and missing minor consent", () => {
    const result = evaluateMediaUpload({
      fileName: "throw.mov",
      mimeType: "video/quicktime",
      sizeBytes: 10 * 1024 * 1024,
      durationSeconds: 120,
      consentToAnalyze: true,
      userIsMinor: true,
      guardianConsent: false,
    });
    expect(result.accepted).toBe(false);
    expect(result.reasons).toHaveLength(2);
  });
});
