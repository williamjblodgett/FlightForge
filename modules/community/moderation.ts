export type ModerationDecision =
  | { status: "PUBLISHED"; reason: null }
  | { status: "QUARANTINED"; reason: "CREDIBLE_THREAT" | "SELF_HARM" | "MINOR_SEXUAL_SAFETY" | "PERSONAL_DATA" };

const highRiskRules: Array<{ reason: Exclude<ModerationDecision["reason"], null>; pattern: RegExp }> = [
  { reason: "CREDIBLE_THREAT", pattern: /\b(?:i(?:'m| am| will|’ll)\s+(?:going to\s+)?(?:kill|shoot|stab|hurt)|you(?:'re| are)\s+dead)\b/iu },
  { reason: "SELF_HARM", pattern: /\b(?:kill myself|end my life|suicide plan|hurt myself)\b/iu },
  { reason: "MINOR_SEXUAL_SAFETY", pattern: /\b(?:child|minor|underage)\b.{0,40}\b(?:nude|sexual|sex|porn)\b/iu },
  { reason: "PERSONAL_DATA", pattern: /\b(?:social security|ssn)\b.{0,20}\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/iu },
];

/** A conservative local safety floor. A provider can augment it but never bypass it. */
export function moderateMessage(body: string): ModerationDecision {
  const match = highRiskRules.find((rule) => rule.pattern.test(body));
  return match ? { status: "QUARANTINED", reason: match.reason } : { status: "PUBLISHED", reason: null };
}
