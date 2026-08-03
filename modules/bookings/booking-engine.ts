export type BookingVisibility = "PUBLIC" | "PRIVATE";

export type BookingQuoteInput = {
  courseId: string;
  date: string;
  time: string;
  playerCount: number;
  remainingCapacity: number;
  unitPriceCents: number;
  isMember: boolean;
  weatherRisk: "NONE" | "RAIN_LIKELY";
};

export type BookingQuote = BookingQuoteInput & {
  id: string;
  subtotalCents: number;
  adjustmentCents: number;
  totalCents: number;
  explanation: string[];
  expiresAt: string;
};

export type Reservation = {
  id: string;
  quoteId: string;
  idempotencyKey: string;
  courseId: string;
  date: string;
  time: string;
  playerCount: number;
  visibility: BookingVisibility;
  totalCents: number;
  status: "CONFIRMED";
  createdAt: string;
};

export class BookingDomainError extends Error {
  constructor(
    public readonly code:
      | "INVALID_PARTY_SIZE"
      | "CAPACITY_EXCEEDED"
      | "QUOTE_EXPIRED",
    message: string,
  ) {
    super(message);
    this.name = "BookingDomainError";
  }
}

const quoteLifetimeMilliseconds = 10 * 60 * 1000;

export function createBookingQuote(
  input: BookingQuoteInput,
  now = new Date(),
): BookingQuote {
  if (!Number.isInteger(input.playerCount) || input.playerCount < 1) {
    throw new BookingDomainError("INVALID_PARTY_SIZE", "Choose at least one player.");
  }
  if (input.playerCount > input.remainingCapacity) {
    throw new BookingDomainError(
      "CAPACITY_EXCEEDED",
      `Only ${input.remainingCapacity} places remain in this tee time.`,
    );
  }

  const subtotalCents = input.unitPriceCents * input.playerCount;
  const explanation: string[] = [];
  let adjustmentRate = 0;
  const day = new Date(`${input.date}T12:00:00`).getDay();
  const hour = Number.parseInt(input.time.split(":")[0] ?? "0", 10);

  if (day === 0 || day === 6) {
    adjustmentRate += 0.1;
    explanation.push("Weekend demand +10%");
  }
  if (hour >= 10 && hour < 14) {
    adjustmentRate += 0.15;
    explanation.push("Peak tee window +15%");
  }
  if (input.isMember) {
    adjustmentRate -= 0.1;
    explanation.push("Member rate −10%");
  }
  if (input.weatherRisk === "RAIN_LIKELY") {
    adjustmentRate -= 0.05;
    explanation.push("Rain-flex rate −5%");
  }

  const adjustmentCents = Math.round(subtotalCents * adjustmentRate);
  const totalCents = Math.max(0, subtotalCents + adjustmentCents);
  const quoteToken = [input.courseId, input.date, input.time, now.getTime()].join("-");

  return {
    ...input,
    id: `quote-${stableHash(quoteToken)}`,
    subtotalCents,
    adjustmentCents,
    totalCents,
    explanation: explanation.length > 0 ? explanation : ["Standard course rate"],
    expiresAt: new Date(now.getTime() + quoteLifetimeMilliseconds).toISOString(),
  };
}

export function confirmBooking(input: {
  quote: BookingQuote;
  idempotencyKey: string;
  visibility: BookingVisibility;
  existingReservations: Reservation[];
  now?: Date;
}): Reservation {
  const duplicate = input.existingReservations.find(
    (reservation) => reservation.idempotencyKey === input.idempotencyKey,
  );
  if (duplicate) {
    return duplicate;
  }

  const now = input.now ?? new Date();
  if (now.getTime() >= new Date(input.quote.expiresAt).getTime()) {
    throw new BookingDomainError("QUOTE_EXPIRED", "This price quote has expired.");
  }

  const reservedSeats = input.existingReservations
    .filter(
      (reservation) =>
        reservation.courseId === input.quote.courseId &&
        reservation.date === input.quote.date &&
        reservation.time === input.quote.time,
    )
    .reduce((total, reservation) => total + reservation.playerCount, 0);
  if (reservedSeats + input.quote.playerCount > input.quote.remainingCapacity) {
    throw new BookingDomainError(
      "CAPACITY_EXCEEDED",
      "That group no longer fits in the selected tee time.",
    );
  }

  return {
    id: `reservation-${stableHash(`${input.idempotencyKey}-${now.toISOString()}`)}`,
    quoteId: input.quote.id,
    idempotencyKey: input.idempotencyKey,
    courseId: input.quote.courseId,
    date: input.quote.date,
    time: input.quote.time,
    playerCount: input.quote.playerCount,
    visibility: input.visibility,
    totalCents: input.quote.totalCents,
    status: "CONFIRMED",
    createdAt: now.toISOString(),
  };
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
