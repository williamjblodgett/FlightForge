import { describe, expect, it } from "vitest";
import { fictionalDemoCourse } from "@/modules/courses/fictional-demo-course";
import { initialDemoState, restoreDemoState } from "@/pages-demo/demo-store";

describe("GitHub Pages demo state migration", () => {
  it("moves every fabricated booking, game, and round off real course ids", () => {
    const legacy = {
      ...initialDemoState,
      schemaVersion: 2,
      reservations: [{
        id: "reservation-old",
        quoteId: "quote-old",
        idempotencyKey: "old",
        courseId: "course-101-arw",
        date: "2026-08-08",
        time: "14:20",
        playerCount: 2,
        visibility: "PUBLIC",
        totalCents: 2400,
        status: "CONFIRMED",
        createdAt: "2026-08-04T12:00:00.000Z",
      }],
      games: [{ ...initialDemoState.games[0], courseId: "course-beaver-brook" }],
      rounds: [{
        id: "round-old",
        courseId: "course-101-arw",
        status: "IN_PROGRESS",
        version: 1,
        holes: [{ hole: 1, par: 3, score: null, updatedAt: null }],
      }],
    } as Record<string, unknown>;
    delete legacy.profile;
    delete legacy.privacy;
    delete legacy.roundDetails;
    delete legacy.lessonProgress;

    const restored = restoreDemoState(legacy);

    expect(restored).not.toBeNull();
    expect(restored?.reservations[0]?.courseId).toBe(fictionalDemoCourse.id);
    expect(restored?.games[0]?.courseId).toBe(fictionalDemoCourse.id);
    expect(restored?.rounds[0]?.courseId).toBe(fictionalDemoCourse.id);
    expect(restored?.privacy.profileVisibility).toBe("FRIENDS");
    expect(restored?.games[0]?.visibility).toBe("PUBLIC");
  });

  it("preserves saved version-three privacy choices", () => {
    const restored = restoreDemoState({
      ...initialDemoState,
      privacy: { ...initialDemoState.privacy, profileVisibility: "PUBLIC", analyticsOptIn: true },
    });

    expect(restored?.privacy.profileVisibility).toBe("PUBLIC");
    expect(restored?.privacy.analyticsOptIn).toBe(true);
  });
});
