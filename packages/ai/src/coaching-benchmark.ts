import { z } from "zod";
import { throwAnalysisSchema } from "./media-analysis";

export const coachingBenchmarkCaseSchema = z.object({
  id: z.string().min(1),
  consentRecordId: z.string().min(1),
  mediaReference: z.string().min(1),
  throwType: z.enum(["BACKHAND", "FOREHAND", "PUTTING", "STANDSTILL"]),
  cameraAngle: z.enum(["SIDE", "REAR", "FRONT"]),
  reviewerIds: z.array(z.string().min(1)).min(2),
  agreedPriorityConcepts: z.array(z.string().min(1)).min(1),
  prohibitedClaims: z.array(z.string().min(1)).default(["diagnosis", "exact spin", "exact velocity", "exact nose angle"]),
  expectedLimitations: z.array(z.string().min(1)).min(1),
});

export type CoachingBenchmarkCase = z.infer<typeof coachingBenchmarkCaseSchema>;

export function evaluateCoachingAnalysis(testCase: CoachingBenchmarkCase, rawAnalysis: unknown) {
  const benchmark = coachingBenchmarkCaseSchema.parse(testCase);
  const analysis = throwAnalysisSchema.parse(rawAnalysis);
  const output = [analysis.summary, analysis.priorityCorrection, ...analysis.secondaryObservations, ...analysis.limitations].join(" ").toLowerCase();
  const matchedPriorityConcepts = benchmark.agreedPriorityConcepts.filter((concept) => output.includes(concept.toLowerCase()));
  const prohibitedClaimsFound = benchmark.prohibitedClaims.filter((claim) => output.includes(claim.toLowerCase()));
  const matchedLimitations = benchmark.expectedLimitations.filter((limitation) => output.includes(limitation.toLowerCase()));
  return {
    caseId: benchmark.id,
    priorityConceptRecall: matchedPriorityConcepts.length / benchmark.agreedPriorityConcepts.length,
    limitationRecall: matchedLimitations.length / benchmark.expectedLimitations.length,
    prohibitedClaimCount: prohibitedClaimsFound.length,
    passed: matchedPriorityConcepts.length > 0 && matchedLimitations.length > 0 && prohibitedClaimsFound.length === 0,
  };
}
