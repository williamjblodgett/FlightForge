import { describe, expect, it } from "vitest";
import {
  BookingDomainError,
  confirmBooking,
  createBookingQuote,
} from "./booking-engine";

const now = new Date("2026-08-08T12:00:00.000Z");

describe("booking engine", () => {
  it("locks a transparent total and applies rule explanations", () => {
    const quote = createBookingQuote(
      {
        courseId: "course-1",
        date: "2026-08-08",
        time: "11:00",
        playerCount: 2,
        remainingCapacity: 4,
        unitPriceCents: 1_000,
        isMember: true,
        weatherRisk: "NONE",
      },
      now,
    );

    expect(quote.totalCents).toBe(2_300);
    expect(quote.explanation).toEqual([
      "Weekend demand +10%",
      "Peak tee window +15%",
      "Member rate −10%",
    ]);
  });

  it("returns the original reservation for a repeated idempotency key", () => {
    const quote = createBookingQuote(
      {
        courseId: "course-1",
        date: "2026-08-10",
        time: "09:00",
        playerCount: 2,
        remainingCapacity: 4,
        unitPriceCents: 800,
        isMember: false,
        weatherRisk: "NONE",
      },
      now,
    );
    const first = confirmBooking({
      quote,
      idempotencyKey: "submit-once",
      visibility: "PUBLIC",
      existingReservations: [],
      now,
    });
    const repeated = confirmBooking({
      quote,
      idempotencyKey: "submit-once",
      visibility: "PUBLIC",
      existingReservations: [first],
      now: new Date(now.getTime() + 1_000),
    });

    expect(repeated).toEqual(first);
  });

  it("rejects over-capacity and expired quotes", () => {
    expect(() =>
      createBookingQuote(
        {
          courseId: "course-1",
          date: "2026-08-10",
          time: "09:00",
          playerCount: 5,
          remainingCapacity: 4,
          unitPriceCents: 800,
          isMember: false,
          weatherRisk: "NONE",
        },
        now,
      ),
    ).toThrowError(BookingDomainError);

    const quote = createBookingQuote(
      {
        courseId: "course-1",
        date: "2026-08-10",
        time: "09:00",
        playerCount: 1,
        remainingCapacity: 4,
        unitPriceCents: 800,
        isMember: false,
        weatherRisk: "NONE",
      },
      now,
    );
    expect(() =>
      confirmBooking({
        quote,
        idempotencyKey: "late-submit",
        visibility: "PRIVATE",
        existingReservations: [],
        now: new Date(now.getTime() + 11 * 60 * 1_000),
      }),
    ).toThrowError(/expired/u);
  });
});
