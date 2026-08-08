import { describe, expect, it } from "vitest";
import { holeHighlightContextSchema } from "./validation";

const valid = {
  courseId: "course-demo",
  eventId: "event-demo",
  holeNumber: 1,
  caption: "Ace on the opening hole.",
  transcript: "The player releases a backhand and the disc enters the basket.",
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

  it("does not accept client-supplied duration as trusted context", () => {
    const result = holeHighlightContextSchema.parse({ ...valid, durationSeconds: 61 });
    expect("durationSeconds" in result).toBe(false);
  });
});
