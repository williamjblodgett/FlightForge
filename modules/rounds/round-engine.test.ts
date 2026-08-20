import { describe, expect, it } from "vitest";
import {
  createRound,
  mergeRoundSnapshots,
  recordHoleScore,
  summarizeRound,
} from "./round-engine";

describe("round engine", () => {
  it("records auditable versions and summarizes completed holes", () => {
    const initial = createRound("round-1", "course-1", [3, 3, 4]);
    const first = recordHoleScore(initial, 1, 2, 1, new Date("2026-08-03T10:00:00Z"));
    const second = recordHoleScore(first, 2, 3, 2, new Date("2026-08-03T10:05:00Z"));

    expect(second.version).toBe(3);
    expect(summarizeRound(second)).toMatchObject({
      completedHoles: 2,
      totalStrokes: 5,
      relativeToPar: -1,
      birdies: 1,
      pars: 1,
    });
  });

  it("rejects stale edits and keeps the latest per-hole offline entry", () => {
    const initial = createRound("round-1", "course-1", [3]);
    expect(() => recordHoleScore(initial, 1, 3, 2)).toThrowError(
      "ROUND_VERSION_CONFLICT",
    );
    const local = recordHoleScore(initial, 1, 4, 1, new Date("2026-08-03T10:05:00Z"));
    const remote = recordHoleScore(initial, 1, 3, 1, new Date("2026-08-03T10:04:00Z"));
    const result = mergeRoundSnapshots(local, remote);

    expect(result.merged.holes[0]?.score).toBe(4);
    expect(result.resolvedHoles).toEqual([1]);
  });

  it("supports aces, high scores, and penalty strokes without truncating the round", () => {
    const initial = createRound("round-2", "course-2", [3, 3]);
    const ace = recordHoleScore(initial, 1, 1, 1, new Date("2026-08-03T10:00:00Z"));
    const difficultHole = recordHoleScore(ace, 2, 24, 2, new Date("2026-08-03T10:05:00Z"), 2);

    expect(difficultHole.holes[0]).toMatchObject({ score: 1, penalties: 0 });
    expect(difficultHole.holes[1]).toMatchObject({ score: 24, penalties: 2 });
    expect(summarizeRound(difficultHole)).toMatchObject({
      totalStrokes: 27,
      relativeToPar: 21,
      completedHoles: 2,
    });
  });
});
