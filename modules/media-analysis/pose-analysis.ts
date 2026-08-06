export type PosePoint = { x: number; y: number; visibility?: number };

export type PoseSummary = {
  sampledFrames: number;
  detectedFrames: number;
  landmarkCount: number;
  averageVisibility: number;
  stanceToShoulderRatio: number | null;
  shoulderTiltDegrees: number | null;
  balanceOffsetPercent: number | null;
  hipTravelPercent: number | null;
  shoulderMotionDegrees: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  observations: string[];
  limitations: string[];
};

export function summarizePose(frames: PosePoint[][], sampledFrames: number): PoseSummary {
  const valid = frames.filter((frame) => frame.length >= 29);
  const visibility = valid.flatMap((frame) => frame.map((point) => point.visibility ?? 0));
  const representative = valid[Math.floor(valid.length / 2)];
  let stance: number | null = null;
  let tilt: number | null = null;
  let balance: number | null = null;
  let hipTravel: number | null = null;
  let shoulderMotion: number | null = null;

  if (representative) {
    const shoulderWidth = distance(representative[11], representative[12]);
    const ankleWidth = distance(representative[27], representative[28]);
    stance = shoulderWidth > 0.001 ? ankleWidth / shoulderWidth : null;
    tilt = lineAngleDegrees(representative[11], representative[12]);
    const hipX = midpointX(representative[23], representative[24]);
    const ankleX = midpointX(representative[27], representative[28]);
    balance = shoulderWidth > 0.001 ? Math.abs(hipX - ankleX) / shoulderWidth * 100 : null;
  }

  if (valid.length >= 3) {
    const first = valid[0];
    const last = valid[valid.length - 1];
    const referenceWidth = average(valid.map((frame) => distance(frame[11], frame[12])).filter((value) => value > 0.001));
    if (referenceWidth) {
      hipTravel = Math.abs(midpointX(last[23], last[24]) - midpointX(first[23], first[24])) / referenceWidth * 100;
    }
    shoulderMotion = angleDifference(lineAngleDegrees(first[11], first[12]), lineAngleDegrees(last[11], last[12]));
  }

  const detectionRate = sampledFrames > 0 ? valid.length / sampledFrames : 0;
  const averageVisibility = visibility.length ? average(visibility) : 0;
  const confidence = detectionRate >= 0.8 && averageVisibility >= 0.75 ? "HIGH" : detectionRate >= 0.5 && averageVisibility >= 0.5 ? "MEDIUM" : "LOW";
  const observations = [
    detectionRate < 0.75
      ? "The full body was not consistently detected; improve lighting, distance, or framing."
      : "The player was detected consistently enough for broad position observations.",
    balance != null && balance > 45
      ? "The representative frame shows the hip center away from the ankle midpoint; review balance across the full clip before changing form."
      : "The representative frame does not show a large static balance offset.",
    tilt != null && tilt > 18
      ? "The shoulders appear noticeably tilted in the representative frame; confirm whether that matches the intended release plane."
      : "No large shoulder tilt was measured in the representative frame.",
    hipTravel != null
      ? `The hip midpoint moved about ${Math.round(hipTravel)}% of the detected shoulder width across the sampled sequence.`
      : "There were not enough consistently detected frames to estimate hip travel.",
    shoulderMotion != null
      ? `The shoulder-line orientation changed about ${Math.round(shoulderMotion)}° across the sampled sequence.`
      : "There were not enough consistently detected frames to estimate shoulder-line motion.",
  ];

  return {
    sampledFrames,
    detectedFrames: valid.length,
    landmarkCount: valid[0]?.length ?? 0,
    averageVisibility,
    stanceToShoulderRatio: stance,
    shoulderTiltDegrees: tilt,
    balanceOffsetPercent: balance,
    hipTravelPercent: hipTravel,
    shoulderMotionDegrees: shoulderMotion,
    confidence,
    observations,
    limitations: [
      "Single-view pose landmarks do not measure disc nose angle, spin, release speed, or joint forces.",
      "The motion values are image-relative observations, not calibrated biomechanical measurements.",
      "Loose clothing, occlusion, camera angle, and motion blur can change these estimates.",
    ],
  };
}

function midpointX(a: PosePoint, b: PosePoint): number { return (a.x + b.x) / 2; }
function distance(a: PosePoint, b: PosePoint): number { return Math.hypot(a.x - b.x, a.y - b.y); }
function lineAngleDegrees(a: PosePoint, b: PosePoint): number { return Math.atan2(Math.abs(a.y - b.y), Math.abs(a.x - b.x)) * 180 / Math.PI; }
function angleDifference(a: number, b: number): number { const difference = Math.abs(a - b) % 180; return Math.min(difference, 180 - difference); }
function average(values: number[]): number { return values.reduce((total, value) => total + value, 0) / values.length; }
