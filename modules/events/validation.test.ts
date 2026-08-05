import { describe, expect, it } from "vitest";
import { eventEditorSchema, eventStatusActionSchema } from "./validation";

function validEvent() {
  return {
    organizationName: "Maine Fairway Club",
    eventType: "TOURNAMENT" as const,
    title: "Pine Tree Open",
    summary: "A welcoming one-day tournament with clearly listed divisions.",
    description: "Players receive a published schedule, organizer contact, and registration details before arriving.",
    courseId: "",
    venueName: "Community Disc Golf Course",
    addressLine1: "",
    city: "Augusta",
    regionCode: "me",
    countryCode: "us",
    startsAt: "2100-06-15T13:00:00.000Z",
    endsAt: "2100-06-15T21:00:00.000Z",
    registrationOpensAt: "2100-01-01T12:00:00.000Z",
    registrationClosesAt: "2100-06-14T21:00:00.000Z",
    registrationUrl: "https://example.org/register",
    contactEmail: "Events@Example.org",
    capacity: 90,
    entryFeeCents: 3500,
    currency: "USD" as const,
    format: "Two rounds of stroke play",
    divisions: ["Recreational", "Advanced"],
    accessibilityNotes: "Contact the organizer for accommodation coordination.",
    visibility: "PUBLIC" as const,
    action: "PUBLISH" as const,
  };
}

describe("event publishing validation", () => {
  it("normalizes region, country, and contact email on a publishable event", () => {
    const result = eventEditorSchema.parse({
      ...validEvent(), courseId: null, addressLine1: null,
      registrationOpensAt: null, registrationClosesAt: null, registrationUrl: null,
    });
    expect(result.regionCode).toBe("ME");
    expect(result.countryCode).toBe("US");
    expect(result.contactEmail).toBe("events@example.org");
    expect(result.courseId).toBeNull();
  });

  it("rejects an event that ends before it starts", () => {
    const result = eventEditorSchema.safeParse({ ...validEvent(), endsAt: "2100-06-15T12:00:00.000Z" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === "endsAt")).toBe(true);
  });

  it("requires a meaningful audit reason for lifecycle actions", () => {
    expect(eventStatusActionSchema.safeParse({ action: "CANCEL", reason: "no", version: 1 }).success).toBe(false);
    expect(eventStatusActionSchema.safeParse({ action: "CANCEL", reason: "Course closed for flooding", version: 1 }).success).toBe(true);
  });
});
