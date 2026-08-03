export type HoleScore = {
  hole: number;
  par: number;
  score: number | null;
  updatedAt: string | null;
};

export type RoundSnapshot = {
  id: string;
  courseId: string;
  status: "IN_PROGRESS" | "COMPLETED";
  version: number;
  holes: HoleScore[];
};

export type RoundSummary = {
  completedHoles: number;
  totalStrokes: number;
  relativeToPar: number;
  birdies: number;
  pars: number;
  bogeysOrWorse: number;
};

export function createRound(
  id: string,
  courseId: string,
  pars: number[],
): RoundSnapshot {
  return {
    id,
    courseId,
    status: "IN_PROGRESS",
    version: 1,
    holes: pars.map((par, index) => ({
      hole: index + 1,
      par,
      score: null,
      updatedAt: null,
    })),
  };
}

export function recordHoleScore(
  round: RoundSnapshot,
  holeNumber: number,
  score: number,
  expectedVersion: number,
  updatedAt = new Date(),
): RoundSnapshot {
  if (expectedVersion !== round.version) {
    throw new Error("ROUND_VERSION_CONFLICT");
  }
  if (!Number.isInteger(score) || score < 1 || score > 20) {
    throw new Error("INVALID_HOLE_SCORE");
  }
  if (!round.holes.some((hole) => hole.hole === holeNumber)) {
    throw new Error("UNKNOWN_HOLE");
  }

  const holes = round.holes.map((hole) =>
    hole.hole === holeNumber
      ? { ...hole, score, updatedAt: updatedAt.toISOString() }
      : hole,
  );
  return {
    ...round,
    holes,
    status: holes.every((hole) => hole.score != null) ? "COMPLETED" : "IN_PROGRESS",
    version: round.version + 1,
  };
}

export function mergeRoundSnapshots(
  local: RoundSnapshot,
  remote: RoundSnapshot,
): { merged: RoundSnapshot; resolvedHoles: number[] } {
  if (local.id !== remote.id) {
    throw new Error("ROUND_ID_MISMATCH");
  }
  const resolvedHoles: number[] = [];
  const holes = local.holes.map((localHole) => {
    const remoteHole = remote.holes.find((hole) => hole.hole === localHole.hole);
    if (!remoteHole || localHole.score === remoteHole.score) {
      return localHole;
    }
    const localTime = localHole.updatedAt ? Date.parse(localHole.updatedAt) : 0;
    const remoteTime = remoteHole.updatedAt ? Date.parse(remoteHole.updatedAt) : 0;
    resolvedHoles.push(localHole.hole);
    return remoteTime > localTime ? remoteHole : localHole;
  });

  return {
    merged: {
      ...local,
      holes,
      status: holes.every((hole) => hole.score != null) ? "COMPLETED" : "IN_PROGRESS",
      version: Math.max(local.version, remote.version) + 1,
    },
    resolvedHoles,
  };
}

export function summarizeRound(round: RoundSnapshot): RoundSummary {
  return round.holes.reduce<RoundSummary>(
    (summary, hole) => {
      if (hole.score == null) return summary;
      const relative = hole.score - hole.par;
      return {
        completedHoles: summary.completedHoles + 1,
        totalStrokes: summary.totalStrokes + hole.score,
        relativeToPar: summary.relativeToPar + relative,
        birdies: summary.birdies + (relative < 0 ? 1 : 0),
        pars: summary.pars + (relative === 0 ? 1 : 0),
        bogeysOrWorse: summary.bogeysOrWorse + (relative > 0 ? 1 : 0),
      };
    },
    {
      completedHoles: 0,
      totalStrokes: 0,
      relativeToPar: 0,
      birdies: 0,
      pars: 0,
      bogeysOrWorse: 0,
    },
  );
}
