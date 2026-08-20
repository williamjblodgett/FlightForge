import type { OfflineHoleScore, OfflineRoundState, PendingScoreMutation } from "./offline-store";
import type { ActiveRound } from "./round-repository";

export type RoundMergeResult = {
  scores: Array<OfflineHoleScore | null>;
  conflictHoles: number[];
};

export function scoresFromActiveRound(round: ActiveRound | null, holeCount: number): Array<OfflineHoleScore | null> {
  const scores: Array<OfflineHoleScore | null> = Array(holeCount).fill(null);
  for (const item of round?.holeScores ?? []) {
    if (item.holeNumber < 1 || item.holeNumber > holeCount) continue;
    scores[item.holeNumber - 1] = {
      strokes: item.strokes,
      penalties: item.penalties,
      updatedAt: item.updatedAt,
    };
  }
  return scores;
}

export function mergeOfflineWithServer(
  round: ActiveRound | null,
  offline: OfflineRoundState | null,
  holeCount: number,
): RoundMergeResult {
  const server = scoresFromActiveRound(round, holeCount);
  if (!offline) return { scores: server, conflictHoles: [] };

  const scores = [...server];
  const conflictHoles = new Set<number>();
  const pendingHoles = new Set(offline.pending.map((mutation) => mutation.holeNumber));

  for (let index = 0; index < holeCount; index += 1) {
    const localScore = offline.scores[index] ?? null;
    const serverScore = server[index] ?? null;
    if (!localScore) continue;
    if (!serverScore) {
      scores[index] = localScore;
      continue;
    }
    if (sameScore(localScore, serverScore)) {
      scores[index] = Date.parse(localScore.updatedAt) >= Date.parse(serverScore.updatedAt) ? localScore : serverScore;
      continue;
    }

    const holeNumber = index + 1;
    conflictHoles.add(holeNumber);
    if (pendingHoles.has(holeNumber) || Date.parse(localScore.updatedAt) > Date.parse(serverScore.updatedAt)) {
      scores[index] = localScore;
    }
  }

  for (const mutation of latestMutationByHole(offline.pending).values()) {
    if (mutation.holeNumber <= holeCount) scores[mutation.holeNumber - 1] = mutation;
  }
  return { scores, conflictHoles: [...conflictHoles].sort((a, b) => a - b) };
}

export function latestMutationByHole(mutations: PendingScoreMutation[]): Map<number, PendingScoreMutation> {
  const latest = new Map<number, PendingScoreMutation>();
  for (const mutation of mutations) latest.set(mutation.holeNumber, mutation);
  return latest;
}

export function mergeServerScoresWithPending(
  round: ActiveRound,
  pending: PendingScoreMutation[],
  holeCount: number,
): Array<OfflineHoleScore | null> {
  const scores = scoresFromActiveRound(round, holeCount);
  for (const mutation of latestMutationByHole(pending).values()) {
    if (mutation.holeNumber <= holeCount) scores[mutation.holeNumber - 1] = mutation;
  }
  return scores;
}

function sameScore(left: OfflineHoleScore, right: OfflineHoleScore): boolean {
  return left.strokes === right.strokes && left.penalties === right.penalties;
}
