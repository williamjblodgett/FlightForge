import type { DiscStability, PlayerDisc } from "@/modules/bags/bag-intelligence";

export const CADDIE_MODEL_VERSION = "flightforge-rules-2.0";

export type CaddieInput = {
  distanceFeet: number;
  windMph: number;
  windDirection: "HEADWIND" | "TAILWIND" | "CROSSWIND" | "LEFT_TO_RIGHT" | "RIGHT_TO_LEFT" | "CALM";
  fairwayShape: "STRAIGHT" | "LEFT" | "RIGHT";
  throwingHand: "RIGHT" | "LEFT";
  throwType?: "BACKHAND" | "FOREHAND";
  controlledDistanceFeet: number | null;
  riskPreference: "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
  elevationChangeFeet?: number | null;
  groundCondition?: "NORMAL" | "WET" | "MUDDY" | "SNOW" | "ICY" | null;
  hazardLevel?: "NONE" | "LOW" | "MODERATE" | "HIGH" | null;
  discs: PlayerDisc[];
};

export type ShotRecommendation = {
  primaryDiscId: string | null;
  primaryDisc: string;
  shotType: string;
  releaseAngle: string;
  power: string;
  landingPlan: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  reasoning: string[];
  executionCue: string;
  mainRisk: string;
  conservativeAlternative: string;
  aggressiveAlternative: string;
  confidence: number;
  confidenceLabel: "LOW" | "MEDIUM" | "HIGH";
  confidenceBasis: string;
  missingInformation: string[];
  modelVersion: string;
};

type RankedDisc = { disc: PlayerDisc; score: number };

export function recommendShot(input: CaddieInput): ShotRecommendation {
  const throwType = input.throwType ?? "BACKHAND";
  const activeDiscs = input.discs.filter((disc) => disc.inBag);
  const targetSpeed = speedForDistance(input.distanceFeet, input.controlledDistanceFeet);
  const targetStability = stabilityForWind(input.windDirection, input.windMph);
  const ranked = activeDiscs
    .map((disc) => ({ disc, score: discFit(disc, input, targetSpeed, targetStability, throwType) }))
    .sort((left, right) => left.score - right.score);
  const selected = ranked[0]?.disc;
  const safer = findAlternative(ranked, selected?.id, (disc) => disc.speed <= (selected?.speed ?? targetSpeed) && disc.reliability !== undefined);
  const aggressive = findAlternative(ranked, selected?.id, (disc) => disc.speed >= (selected?.speed ?? targetSpeed));
  const missingInformation = missingInputs(input, selected);
  const referenceDistance = selected?.observedDistanceFeet ?? input.controlledDistanceFeet ?? 300;
  const powerRatio = input.distanceFeet / Math.max(100, referenceDistance);
  const power = powerRatio < 0.65 ? "Smooth 60–70%" : powerRatio < 0.9 ? "Controlled 75–85%" : "Full controlled power";
  const fadeDirection = naturalFadeDirection(input.throwingHand, throwType);
  const shotType = shotTypeFor(input.fairwayShape, fadeDirection, throwType);
  const releaseAngle = releaseAngleFor(input.fairwayShape, fadeDirection, selected);
  const risk = input.riskPreference === "AGGRESSIVE" ? "HIGH" : input.riskPreference === "CONSERVATIVE" ? "LOW" : "MEDIUM";
  const discName = selected ? `${selected.manufacturer} ${selected.mold}${selected.nickname ? ` “${selected.nickname}”` : ""}` : "your most familiar neutral fairway disc";
  const confidence = confidenceFor(input, selected);
  const observed = (selected?.sampleCount ?? 0) > 0;

  return {
    primaryDiscId: selected?.id ?? null,
    primaryDisc: discName,
    shotType,
    releaseAngle,
    power,
    landingPlan: landingPlanFor(input),
    risk,
    reasoning: [
      selected?.observedDistanceFeet
        ? `Your recorded ${Math.round(selected.observedDistanceFeet)} ft typical distance is compared with this ${input.distanceFeet} ft shot.`
        : `${input.distanceFeet} ft maps to an approximate speed-${targetSpeed} requirement for your stated power.`,
      windReason(input.windDirection, input.windMph),
      selected
        ? `${flightLabel(selected)} is the closest active owned-disc match after weight, wear, line shape, and reliability adjustments.`
        : "No active owned disc was available, so the advice remains characteristic-based.",
      observed
        ? `Personalized with ${selected?.sampleCount ?? 0} representative ${throwType.toLowerCase()} observation${selected?.sampleCount === 1 ? "" : "s"}.`
        : "This is catalog-based until representative throws are recorded.",
    ],
    executionCue: executionCueFor(input, releaseAngle),
    mainRisk: mainRiskFor(input, selected),
    conservativeAlternative: safer
      ? `${safer.manufacturer} ${safer.mold}: reduce power and favor the widest safe landing zone.`
      : `Disc down and land short of the main hazard at ${power}.`,
    aggressiveAlternative: aggressive
      ? `${aggressive.manufacturer} ${aggressive.mold}: use only if the long miss remains safe.`
      : "Use a faster line only if the miss beyond the landing zone remains safe.",
    confidence,
    confidenceLabel: confidence >= 0.78 ? "HIGH" : confidence >= 0.58 ? "MEDIUM" : "LOW",
    confidenceBasis: observed
      ? `Profile-adjusted from ${selected?.sampleCount ?? 0} recorded throws plus the manufacturer baseline.`
      : selected?.ratingSource
        ? `Catalog baseline from ${selected.ratingSource}; no personal flight sample yet.`
        : "User-entered flight numbers with limited independent evidence.",
    missingInformation,
    modelVersion: CADDIE_MODEL_VERSION,
  };
}

function discFit(
  disc: PlayerDisc,
  input: CaddieInput,
  targetSpeed: number,
  stability: DiscStability,
  throwType: NonNullable<CaddieInput["throwType"]>,
): number {
  const turn = disc.observedTurn ?? disc.turn;
  const fade = disc.observedFade ?? disc.fade;
  const distancePenalty = disc.observedDistanceFeet
    ? Math.abs(disc.observedDistanceFeet - input.distanceFeet) / 38
    : Math.abs(disc.speed - targetSpeed) * 1.8;
  const stabilityPenalty = disc.stability === stability ? 0 : 2.6;
  const fadeDirection = naturalFadeDirection(input.throwingHand, throwType);
  const shapePenalty = input.fairwayShape === "STRAIGHT"
    ? Math.abs(turn + 0.5) * 0.8 + Math.max(0, fade - 2) * 0.9
    : input.fairwayShape === fadeDirection
      ? Math.max(0, 1.5 - fade) * 1.5 + Math.max(0, -2 - turn)
      : Math.max(0, turn + 1) * 1.8 + Math.max(0, fade - 2.5);
  const windPenalty = input.windDirection === "HEADWIND" && input.windMph >= 8
    ? Math.max(0, -turn - 0.5) * 1.5 + Math.max(0, 2 - fade) + (disc.wearRating ?? 0) * 0.12
    : input.windDirection === "TAILWIND" && input.windMph >= 8
      ? Math.max(0, turn + 1) + Math.max(0, fade - 3) * 0.6
      : input.windMph >= 15 ? disc.glide * 0.12 : 0;
  const reliabilityBonus = (disc.reliability ?? 0.5) * (input.riskPreference === "CONSERVATIVE" ? 3.2 : 1.8);
  const familiarityBonus = Math.min(1.5, (disc.sampleCount ?? 0) / 8);
  const aggressiveBonus = input.riskPreference === "AGGRESSIVE" ? disc.glide * 0.16 : 0;
  return distancePenalty + stabilityPenalty + shapePenalty + windPenalty - reliabilityBonus - familiarityBonus - aggressiveBonus;
}

function speedForDistance(distanceFeet: number, controlledDistanceFeet: number | null): number {
  const powerAdjustment = controlledDistanceFeet && controlledDistanceFeet < 275 ? -1 : controlledDistanceFeet && controlledDistanceFeet > 425 ? 1 : 0;
  if (distanceFeet < 180) return 3;
  if (distanceFeet < 250) return 5;
  if (distanceFeet < 330) return Math.max(5, 8 + powerAdjustment);
  if (distanceFeet < 410) return Math.max(7, 10 + powerAdjustment);
  return Math.min(14, 12 + powerAdjustment);
}

function stabilityForWind(direction: CaddieInput["windDirection"], speed: number): DiscStability {
  if (direction === "HEADWIND" && speed >= 8) return "OVERSTABLE";
  if (direction === "TAILWIND" && speed >= 8) return "UNDERSTABLE";
  return "STABLE";
}

function naturalFadeDirection(hand: CaddieInput["throwingHand"], throwType: NonNullable<CaddieInput["throwType"]>): "LEFT" | "RIGHT" {
  const fadesLeft = (hand === "RIGHT" && throwType === "BACKHAND") || (hand === "LEFT" && throwType === "FOREHAND");
  return fadesLeft ? "LEFT" : "RIGHT";
}

function shotTypeFor(shape: CaddieInput["fairwayShape"], fadeDirection: "LEFT" | "RIGHT", throwType: string): string {
  if (shape === "STRAIGHT") return `${titleCase(throwType)} flat release`;
  return shape === fadeDirection ? `Controlled ${titleCase(throwType)} hyzer` : `${titleCase(throwType)} turnover or opposite-side option`;
}

function releaseAngleFor(shape: CaddieInput["fairwayShape"], fadeDirection: "LEFT" | "RIGHT", disc?: PlayerDisc): string {
  if (shape === "STRAIGHT" && (disc?.turn ?? 0) <= -1) return "Gentle hyzer to flat";
  if (shape === "STRAIGHT") return "Flat, nose-neutral release";
  return shape === fadeDirection ? "Comfortable hyzer" : "Controlled anhyzer; avoid forcing the angle";
}

function windReason(direction: CaddieInput["windDirection"], speed: number): string {
  if (direction === "CALM" || speed < 4) return "Calm conditions favor a familiar neutral flight.";
  if (direction === "HEADWIND") return `${speed} mph headwind raises relative airspeed, so turn resistance and dependable fade receive more weight.`;
  if (direction === "TAILWIND") return `${speed} mph tailwind lowers relative airspeed, so glide and easier turn receive more weight.`;
  return `${speed} mph crosswind raises uncertainty; lower exposure and reliable angle control receive more weight than raw distance.`;
}

function confidenceFor(input: CaddieInput, disc?: PlayerDisc): number {
  if (!disc) return 0.38;
  let confidence = 0.42;
  if (disc.ratingSource) confidence += 0.12;
  if (input.controlledDistanceFeet) confidence += 0.1;
  if (disc.weightGrams) confidence += 0.04;
  if (disc.condition && disc.wearRating !== undefined) confidence += 0.05;
  confidence += Math.min(0.18, (disc.sampleCount ?? 0) * 0.015);
  confidence += Math.min(0.07, (disc.profileConfidence ?? 0) * 0.07);
  if (input.elevationChangeFeet == null) confidence -= 0.03;
  if (input.hazardLevel == null) confidence -= 0.03;
  return Math.round(Math.max(0.3, Math.min(0.92, confidence)) * 100) / 100;
}

function missingInputs(input: CaddieInput, disc?: PlayerDisc): string[] {
  const missing: string[] = [];
  if (input.controlledDistanceFeet == null) missing.push("controlled throwing distance");
  if (input.elevationChangeFeet == null) missing.push("elevation change");
  if (input.hazardLevel == null) missing.push("hazard severity");
  if (disc && !disc.weightGrams) missing.push("selected disc weight");
  if (disc && disc.wearRating === undefined) missing.push("selected disc wear");
  if (disc && !(disc.sampleCount ?? 0)) missing.push("personal throws with this disc");
  return missing;
}

function landingPlanFor(input: CaddieInput): string {
  if (input.hazardLevel === "HIGH" || input.riskPreference === "CONSERVATIVE") return "Center the widest safe landing zone and preserve a simple next shot.";
  if (input.groundCondition === "ICY" || input.groundCondition === "WET") return "Land flatter and short of the target to limit skips and slides.";
  return "Favor the broad landing zone while leaving an unobstructed next shot.";
}

function executionCueFor(input: CaddieInput, releaseAngle: string): string {
  if (input.windDirection === "HEADWIND") return `Keep the nose down, use ${releaseAngle.toLowerCase()}, and commit to a balanced finish.`;
  if (input.windDirection === "LEFT_TO_RIGHT" || input.windDirection === "RIGHT_TO_LEFT" || input.windDirection === "CROSSWIND") {
    return `Use ${releaseAngle.toLowerCase()} and avoid exposing the underside of the flight plate to the crosswind.`;
  }
  return `Use ${releaseAngle.toLowerCase()} and finish in balance rather than adding uncontrolled power.`;
}

function mainRiskFor(input: CaddieInput, disc?: PlayerDisc): string {
  if (!disc) return "The caddie has no owned-disc evidence for this recommendation.";
  if (input.windDirection === "HEADWIND" && (disc.observedTurn ?? disc.turn) < -1) return "Unexpected high-speed turn could carry the disc away from the intended line.";
  if (input.hazardLevel === "HIGH") return "A full-power miss may bring the primary hazard into play.";
  if ((disc.sampleCount ?? 0) < 3) return "The selected disc has too little personal history to predict its finish confidently.";
  return "Changing wind or release angle can still move the finish outside the planned landing zone.";
}

function findAlternative(ranked: RankedDisc[], selectedId: string | undefined, predicate: (disc: PlayerDisc) => boolean): PlayerDisc | undefined {
  return ranked.find(({ disc }) => disc.id !== selectedId && predicate(disc))?.disc;
}

function flightLabel(disc: PlayerDisc): string {
  return `${disc.speed}/${disc.glide}/${disc.observedTurn ?? disc.turn}/${disc.observedFade ?? disc.fade}`;
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
