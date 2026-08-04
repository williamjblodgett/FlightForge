import type { DiscStability, PlayerDisc } from "@/modules/bags/bag-intelligence";

export type CaddieInput = {
  distanceFeet: number;
  windMph: number;
  windDirection: "HEADWIND" | "TAILWIND" | "CROSSWIND" | "CALM";
  fairwayShape: "STRAIGHT" | "LEFT" | "RIGHT";
  throwingHand: "RIGHT" | "LEFT";
  controlledDistanceFeet: number | null;
  riskPreference: "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
  discs: PlayerDisc[];
};

export type ShotRecommendation = {
  primaryDisc: string;
  shotType: string;
  power: string;
  landingPlan: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  reasoning: string[];
  executionCue: string;
  conservativeAlternative: string;
  aggressiveAlternative: string;
  confidence: number;
  missingInformation: string[];
};

export function recommendShot(input: CaddieInput): ShotRecommendation {
  const activeDiscs = input.discs.filter((disc) => disc.inBag);
  const targetSpeed = speedForDistance(input.distanceFeet);
  const targetStability = stabilityForWind(input.windDirection, input.windMph);
  const selected = [...activeDiscs].sort(
    (left, right) => discFit(left, targetSpeed, targetStability) - discFit(right, targetSpeed, targetStability),
  )[0];
  const missingInformation = input.controlledDistanceFeet == null ? ["Controlled throwing distance"] : [];
  const powerRatio = input.controlledDistanceFeet
    ? input.distanceFeet / input.controlledDistanceFeet
    : input.distanceFeet / 300;
  const power = powerRatio < 0.65 ? "Smooth 60–70%" : powerRatio < 0.9 ? "Controlled 75–85%" : "Full controlled power";
  const naturalFinish = input.throwingHand === "RIGHT" ? "left" : "right";
  const shotType =
    input.fairwayShape === "STRAIGHT"
      ? "Flat release"
      : input.fairwayShape.toLowerCase() === naturalFinish
        ? "Controlled hyzer"
        : "Gentle turnover or forehand";
  const risk = input.riskPreference === "AGGRESSIVE" ? "HIGH" : input.riskPreference === "CONSERVATIVE" ? "LOW" : "MEDIUM";
  const discName = selected ? `${selected.manufacturer} ${selected.mold}` : "your slowest stable fairway disc";

  return {
    primaryDisc: discName,
    shotType,
    power,
    landingPlan: "Favor the widest safe landing zone and leave an unobstructed next shot.",
    risk,
    reasoning: [
      `${input.distanceFeet} ft calls for roughly speed ${targetSpeed}.`,
      windReason(input.windDirection, input.windMph, targetStability),
      selected ? "This recommendation uses a disc already marked in your bag." : "No close owned match was found, so the advice stays characteristic-based.",
    ],
    executionCue: input.windDirection === "HEADWIND" ? "Keep the nose down and commit to a clean release." : "Use a balanced finish and match the release angle to the landing zone.",
    conservativeAlternative: `Disc down and play short of the main hazard with ${power}.`,
    aggressiveAlternative: "Use the faster line only if the miss beyond the landing zone remains safe.",
    confidence: missingInformation.length === 0 && selected ? 0.86 : selected ? 0.7 : 0.52,
    missingInformation,
  };
}

function speedForDistance(distanceFeet: number): number {
  if (distanceFeet < 180) return 3;
  if (distanceFeet < 250) return 5;
  if (distanceFeet < 330) return 8;
  if (distanceFeet < 410) return 10;
  return 12;
}

function stabilityForWind(direction: CaddieInput["windDirection"], speed: number): DiscStability {
  if (direction === "HEADWIND" && speed >= 8) return "OVERSTABLE";
  if (direction === "TAILWIND" && speed >= 8) return "UNDERSTABLE";
  return "STABLE";
}

function discFit(disc: PlayerDisc, targetSpeed: number, stability: DiscStability): number {
  return Math.abs(disc.speed - targetSpeed) * 2 + (disc.stability === stability ? 0 : 3);
}

function windReason(
  direction: CaddieInput["windDirection"],
  speed: number,
  stability: DiscStability,
): string {
  if (direction === "CALM" || speed < 4) return "Calm conditions favor a neutral, familiar flight.";
  const stabilityLabel = stability.toLowerCase();
  const article = /^[aeiou]/u.test(stabilityLabel) ? "an" : "a";
  return `${speed} mph ${direction.toLowerCase()} conditions favor ${article} ${stabilityLabel} flight.`;
}
