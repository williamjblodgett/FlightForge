import { describe, expect, it } from "vitest";
import type { ActiveRound } from "./round-repository";
import { mergeOfflineWithServer, mergeServerScoresWithPending } from "./offline-merge";
import { validateOfflineRound, type OfflineRoundState } from "./offline-store";

const serverRound: ActiveRound = {
  id: "round-1",
  eventId: "event-1",
  courseId: "course-1",
  layoutId: null,
  scorecardId: "card-1",
  version: 4,
  lastSyncedAt: "2026-08-20T10:00:00.000Z",
  corrections: [],
  holeScores: [
    { holeNumber: 1, strokes: 3, penalties: 0, updatedAt: "2026-08-20T10:00:00.000Z" },
    { holeNumber: 2, strokes: 4, penalties: 0, updatedAt: "2026-08-20T10:00:00.000Z" },
  ],
};

describe("offline round persistence and merging", () => {
  it("keeps a queued local correction and identifies the conflicting server hole", () => {
    const offline = state({
      scores: [
        { strokes: 2, penalties: 1, updatedAt: "2026-08-20T10:05:00.000Z" },
        null,
      ],
      pending: [{
        holeNumber: 1,
        strokes: 2,
        penalties: 1,
        updatedAt: "2026-08-20T10:05:00.000Z",
        clientMutationId: "12345678-local",
      }],
    });
    const result = mergeOfflineWithServer(serverRound, offline, 3);

    expect(result.conflictHoles).toEqual([1]);
    expect(result.scores[0]).toMatchObject({ strokes: 2, penalties: 1 });
    expect(result.scores[1]).toMatchObject({ strokes: 4, penalties: 0 });
  });

  it("uses the newest pending value per hole after a successful server response", () => {
    const pending = [
      { holeNumber: 2, strokes: 5, penalties: 0, updatedAt: "2026-08-20T10:01:00.000Z", clientMutationId: "12345678-first" },
      { holeNumber: 2, strokes: 6, penalties: 1, updatedAt: "2026-08-20T10:02:00.000Z", clientMutationId: "12345678-second" },
    ];
    const scores = mergeServerScoresWithPending(serverRound, pending, 3);
    expect(scores[1]).toMatchObject({ strokes: 6, penalties: 1 });
  });

  it("rejects malformed browser records instead of restoring unsafe values", () => {
    expect(validateOfflineRound({ ...state(), scores: [{ strokes: 0, penalties: 0, updatedAt: "bad" }] }, "event-1", "user-1")).toBeNull();
    expect(validateOfflineRound(state(), "another-event", "user-1")).toBeNull();
    expect(validateOfflineRound(state(), "event-1", "another-user")).toBeNull();
    expect(validateOfflineRound(state(), "event-1", "user-1")).not.toBeNull();
  });
});

function state(overrides: Partial<OfflineRoundState> = {}): OfflineRoundState {
  return {
    schemaVersion: 2,
    eventId: "event-1",
    ownerScope: "user-1",
    roundId: "round-1",
    serverVersion: 3,
    scores: [],
    pending: [],
    updatedAt: "2026-08-20T10:05:00.000Z",
    lastSyncedAt: null,
    ...overrides,
  };
}
