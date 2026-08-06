import { describe, expect, it } from "vitest";
import { evaluateCoachingAnalysis, type CoachingBenchmarkCase } from "./coaching-benchmark";

const benchmark: CoachingBenchmarkCase = {
  id: "side-backhand-001",
  consentRecordId: "consent-001",
  mediaReference: "private://benchmark/001",
  throwType: "BACKHAND",
  cameraAngle: "SIDE",
  reviewerIds: ["coach-a", "coach-b"],
  agreedPriorityConcepts: ["balance"],
  prohibitedClaims: ["exact velocity", "diagnosis"],
  expectedLimitations: ["single camera"],
};

const analysis = {
  summary: "The visible sequence is generally controlled.",
  effective: ["Full-body framing"],
  priorityCorrection: "Work on balance through the plant step.",
  secondaryObservations: ["The follow-through remains in frame."],
  drill: "Use a slow standstill repetition.",
  nextCameraAngle: "Rear view",
  confidence: "MEDIUM",
  limitations: ["A single camera cannot establish depth or exact disc measurements."],
  safetyNote: "Stop if movement causes pain.",
};

describe("evaluateCoachingAnalysis", () => {
  it("passes analysis aligned with reviewed concepts and limitations", () => {
    const result = evaluateCoachingAnalysis(benchmark, analysis);
    expect(result.passed).toBe(true);
    expect(result.priorityConceptRecall).toBe(1);
    expect(result.prohibitedClaimCount).toBe(0);
  });

  it("fails outputs containing prohibited certainty claims", () => {
    const result = evaluateCoachingAnalysis(benchmark, { ...analysis, summary: "Exact velocity was measured." });
    expect(result.passed).toBe(false);
    expect(result.prohibitedClaimCount).toBe(1);
  });
});
