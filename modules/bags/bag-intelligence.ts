export type DiscStability = "UNDERSTABLE" | "STABLE" | "OVERSTABLE";

export type PlayerDisc = {
  id: string;
  manufacturer: string;
  mold: string;
  speed: number;
  glide: number;
  turn: number;
  fade: number;
  stability: DiscStability;
  inBag: boolean;
};

export type BagAnalysis = {
  coverage: number;
  missingSlots: string[];
  overlaps: string[][];
};

export function analyzeBag(discs: PlayerDisc[]): BagAnalysis {
  const active = discs.filter((disc) => disc.inBag);
  const slots = [
    { label: "Understable fairway", matches: (disc: PlayerDisc) => disc.speed >= 6 && disc.speed <= 9 && disc.stability === "UNDERSTABLE" },
    { label: "Stable midrange", matches: (disc: PlayerDisc) => disc.speed >= 4 && disc.speed <= 6 && disc.stability === "STABLE" },
    { label: "Overstable approach", matches: (disc: PlayerDisc) => disc.speed <= 5 && disc.stability === "OVERSTABLE" },
    { label: "Neutral putter", matches: (disc: PlayerDisc) => disc.speed <= 3 && disc.stability === "STABLE" },
    { label: "Wind driver", matches: (disc: PlayerDisc) => disc.speed >= 9 && disc.stability === "OVERSTABLE" },
  ];
  const missingSlots = slots.filter((slot) => !active.some(slot.matches)).map((slot) => slot.label);
  const overlaps: string[][] = [];
  for (let left = 0; left < active.length; left += 1) {
    for (let right = left + 1; right < active.length; right += 1) {
      const first = active[left];
      const second = active[right];
      if (
        first &&
        second &&
        Math.abs(first.speed - second.speed) <= 1 &&
        first.stability === second.stability
      ) {
        overlaps.push([first.mold, second.mold]);
      }
    }
  }

  return {
    coverage: Math.round(((slots.length - missingSlots.length) / slots.length) * 100),
    missingSlots,
    overlaps,
  };
}
