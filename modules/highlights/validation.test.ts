import { describe, expect, it } from "vitest";
import { holeHighlightContextSchema } from "./validation";

const valid = {
  courseId: "course-demo",
  eventId: "event-demo",
  holeNumber: 1,
  caption: "Ace on the opening hole.",
  durationSeconds: 12,
  rightsConfirmed: true,
  participantConsentConfirmed: true,
  containsMinor: false,
  guardianConsentConfirmed: false,
  idempotencyKey: "b4bcc1b0-09a7-4bce-acbf-1ad4a8f40ed5",
};

describe("hole highlight validation", () => {
  it("accepts a short consented highlight", () => {
    expect(holeHighlightContextSchema.safeParse(valid).success).toBe(true);
  });

  it("requires guardian consent for identifiable minors", () => {
    expect(holeHighlightContextSchema.safeParse({ ...valid, containsMinor: true }).success).toBe(false);
  });

  it("rejects videos longer than one minute", () => {
    expect(holeHighlightContextSchema.safeParse({ ...valid, durationSeconds: 61 }).success).toBe(false);
  });
});
