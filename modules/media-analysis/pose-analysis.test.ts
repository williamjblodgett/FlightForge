import { describe, expect, it } from "vitest";
import { summarizePose, type PosePoint } from "./pose-analysis";

function frame(offset = 0, shoulderDrop = 0): PosePoint[] {
  const points = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.95 }));
  points[11] = { x: 0.4 + offset, y: 0.3, visibility: 0.95 };
  points[12] = { x: 0.6 + offset, y: 0.3 + shoulderDrop, visibility: 0.95 };
  points[23] = { x: 0.45 + offset, y: 0.6, visibility: 0.95 };
  points[24] = { x: 0.55 + offset, y: 0.6, visibility: 0.95 };
  points[27] = { x: 0.38 + offset, y: 0.9, visibility: 0.95 };
  points[28] = { x: 0.62 + offset, y: 0.9, visibility: 0.95 };
  return points;
}

describe("summarizePose", () => {
  it("reports temporal, image-relative observations from sufficiently visible landmarks", () => {
    const result = summarizePose([frame(0), frame(0.04, 0.03), frame(0.1, 0.06)], 3);
    expect(result.confidence).toBe("HIGH");
    expect(result.detectedFrames).toBe(3);
    expect(result.hipTravelPercent).toBeGreaterThan(40);
    expect(result.shoulderMotionDegrees).toBeGreaterThan(10);
    expect(result.limitations.join(" ")).toContain("not calibrated");
  });

  it("fails confidence closed when detection is sparse", () => {
    const result = summarizePose([frame()], 12);
    expect(result.confidence).toBe("LOW");
    expect(result.hipTravelPercent).toBeNull();
    expect(result.observations[0]).toContain("not consistently detected");
  });
});
