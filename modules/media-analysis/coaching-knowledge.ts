export const coachingSources = [
  {
    title: "PDGA Official Rules of Disc Golf",
    url: "https://www.pdga.com/rules/official-rules-disc-golf",
    kind: "Official rules",
  },
  {
    title: "PDGA Player Code",
    url: "https://www.pdga.com/code",
    kind: "Official safety guidance",
  },
  {
    title: "Three Keys to a Better Sidearm",
    url: "https://www.pdga.com/news/three-keys-better-sidearm",
    kind: "Coach-reviewed instruction",
  },
  {
    title: "Kinematic differences in skilled and unskilled sidearm throws",
    url: "https://pubmed.ncbi.nlm.nih.gov/18972880/",
    kind: "Peer-reviewed research",
  },
  {
    title: "Flying-disc spin velocity and throwing performance",
    url: "https://pubmed.ncbi.nlm.nih.gov/28633608/",
    kind: "Peer-reviewed research",
  },
] as const;

export type ThrowType = "BACKHAND" | "FOREHAND" | "PUTTING" | "STANDSTILL";
export type CameraAngle = "SIDE" | "REAR" | "FRONT";

export const throwGuides: Record<ThrowType, {
  title: string;
  framing: string;
  priorities: string[];
  drill: string;
  limitation: string;
}> = {
  BACKHAND: {
    title: "Backhand field session",
    framing: "Use a side view, landscape orientation, with the full run-up and follow-through visible.",
    priorities: ["Balanced athletic setup", "Smooth timing before maximum effort", "Complete follow-through without forcing the joint"],
    drill: "Throw five controlled standstills at 60–70% power and keep the finish balanced for two seconds.",
    limitation: "A single ordinary camera cannot reliably measure nose angle, spin rate, or release speed.",
  },
  FOREHAND: {
    title: "Forehand field session",
    framing: "Use a rear-quarter or side view with the throwing hand visible from setup through release.",
    priorities: ["Stable balance", "Comfortable elbow path", "Clean wrist-driven spin without forcing the arm"],
    drill: "Start with short putter flicks, then increase distance only while the release stays smooth.",
    limitation: "Forehand research supports the importance of spin, but phone video does not directly measure it.",
  },
  PUTTING: {
    title: "Putting session",
    framing: "Use a front or side view that includes both feet, the hand, release, and basket line.",
    priorities: ["Repeatable setup", "Quiet balance", "Committed extension toward the intended line"],
    drill: "Make sets of five from a comfortable distance and reset your stance before every putt.",
    limitation: "Make/miss outcome alone cannot identify the cause of a miss.",
  },
  STANDSTILL: {
    title: "Standstill mechanics",
    framing: "Use a side view with the full body and expected flight line visible.",
    priorities: ["Stable base", "Unhurried sequence", "Balanced finish"],
    drill: "Throw neutral putters at 60% effort while holding the finish after each throw.",
    limitation: "This guide describes observable movement and does not provide medical or biomechanical diagnosis.",
  },
};

export function coachingObservation(throwType: ThrowType, result: string) {
  const guide = throwGuides[throwType];
  const observations: Record<string, string> = {
    EARLY: "The result is consistent with an early miss, but grip, timing, footing, or the intended line could each contribute.",
    LATE: "The result is consistent with a late miss; confirm alignment and reduce effort before changing several mechanics at once.",
    LOW: "Repeated low finishes can come from aim, posture, timing, or confidence. Test one small change at a time.",
    HIGH: "A high result may reflect release direction, nose presentation, or wind. Ordinary video cannot separate these reliably.",
    CLEAN: "The throw matched the intended result. Preserve the repeatable setup before adding speed or distance.",
  };
  return {
    summary: observations[result] ?? "Record the intended line and actual result so the next review has useful context.",
    priority: guide.priorities[0],
    secondary: guide.priorities.slice(1),
    drill: guide.drill,
    confidence: result ? "Moderate for outcome-based guidance; low for precise biomechanics." : "Low until a result is recorded.",
    limitation: guide.limitation,
  };
}
