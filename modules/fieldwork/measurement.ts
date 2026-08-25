import type {
  CapturedPosition,
  FieldworkSession,
  GeographicPoint,
  MeasurementConfidence,
  ThrowMeasurement,
} from "./types";

const EARTH_RADIUS_METERS = 6_371_008.8;
const FEET_PER_METER = 3.280_839_895;
const MAX_SAVED_MEASUREMENTS = 20;
let fallbackIdCounter = 0;

export const EMPTY_FIELDWORK_SESSION: FieldworkSession = {
  version: 1,
  searchPosition: null,
  start: null,
  landing: null,
  measurements: [],
};

export function isGeographicPoint(value: unknown): value is GeographicPoint {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GeographicPoint>;
  return Number.isFinite(candidate.latitude)
    && Number.isFinite(candidate.longitude)
    && Number(candidate.latitude) >= -90
    && Number(candidate.latitude) <= 90
    && Number(candidate.longitude) >= -180
    && Number(candidate.longitude) <= 180;
}

export function isCapturedPosition(value: unknown): value is CapturedPosition {
  if (!isGeographicPoint(value)) return false;
  const candidate = value as Partial<CapturedPosition>;
  return Number.isFinite(candidate.accuracyMeters)
    && Number(candidate.accuracyMeters) >= 0
    && typeof candidate.capturedAt === "string"
    && Number.isFinite(Date.parse(candidate.capturedAt));
}

export function haversineDistanceMeters(start: GeographicPoint, end: GeographicPoint): number {
  if (!isGeographicPoint(start) || !isGeographicPoint(end)) {
    throw new RangeError("Both locations must contain valid latitude and longitude values.");
  }

  const startLatitude = degreesToRadians(start.latitude);
  const endLatitude = degreesToRadians(end.latitude);
  const latitudeDelta = endLatitude - startLatitude;
  const longitudeDelta = degreesToRadians(end.longitude - start.longitude);
  const halfLatitude = Math.sin(latitudeDelta / 2);
  const halfLongitude = Math.sin(longitudeDelta / 2);
  const haversine = halfLatitude ** 2
    + Math.cos(startLatitude) * Math.cos(endLatitude) * halfLongitude ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export function distanceFeet(distanceMeters: number): number {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    throw new RangeError("Distance must be a non-negative number.");
  }
  return distanceMeters * FEET_PER_METER;
}

export function measurementConfidence(
  distanceMeters: number,
  startAccuracyMeters: number,
  landingAccuracyMeters: number,
): MeasurementConfidence {
  const uncertainty = combinedAccuracyMeters(startAccuracyMeters, landingAccuracyMeters);
  if (distanceMeters <= 0 || uncertainty <= 0) return distanceMeters > 0 && uncertainty === 0 ? "HIGH" : "LOW";

  const uncertaintyRatio = uncertainty / distanceMeters;
  const worstFix = Math.max(startAccuracyMeters, landingAccuracyMeters);
  if (worstFix <= 5 && uncertaintyRatio <= 0.1) return "HIGH";
  if (worstFix <= 15 && uncertaintyRatio <= 0.25) return "MEDIUM";
  return "LOW";
}

export function createThrowMeasurement(
  start: CapturedPosition,
  landing: CapturedPosition,
  id = createMeasurementId(),
): ThrowMeasurement {
  if (!isCapturedPosition(start) || !isCapturedPosition(landing)) {
    throw new RangeError("A measurement requires two valid GPS captures.");
  }
  const distanceMeters = haversineDistanceMeters(start, landing);
  return {
    id,
    distanceMeters,
    distanceFeet: distanceFeet(distanceMeters),
    estimatedUncertaintyMeters: combinedAccuracyMeters(start.accuracyMeters, landing.accuracyMeters),
    confidence: measurementConfidence(distanceMeters, start.accuracyMeters, landing.accuracyMeters),
    measuredAt: landing.capturedAt,
  };
}

export function readFieldworkSession(rawValue: string | null): FieldworkSession {
  if (!rawValue) return { ...EMPTY_FIELDWORK_SESSION };
  try {
    const parsed = JSON.parse(rawValue) as Partial<FieldworkSession>;
    if (parsed.version !== 1) return { ...EMPTY_FIELDWORK_SESSION };

    const measurements = Array.isArray(parsed.measurements)
      ? parsed.measurements
        .filter(isStoredMeasurement)
        .slice(0, MAX_SAVED_MEASUREMENTS)
        .map((measurement) => ({ ...measurement }))
      : [];

    return { version: 1, searchPosition: null, start: null, landing: null, measurements };
  } catch {
    return { ...EMPTY_FIELDWORK_SESSION };
  }
}

/**
 * Persist only derived throw summaries. Precise search, start, and landing
 * coordinates intentionally remain session-memory data.
 */
export function serializeFieldworkSession(session: FieldworkSession): string {
  return JSON.stringify({ version: 1, measurements: session.measurements });
}

export function appendMeasurement(
  session: FieldworkSession,
  measurement: ThrowMeasurement,
): FieldworkSession {
  return {
    ...session,
    measurements: [measurement, ...session.measurements.filter((item) => item.id !== measurement.id)]
      .slice(0, MAX_SAVED_MEASUREMENTS),
  };
}

function combinedAccuracyMeters(startAccuracyMeters: number, landingAccuracyMeters: number): number {
  if (![startAccuracyMeters, landingAccuracyMeters].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new RangeError("GPS accuracy must be a non-negative number.");
  }
  return startAccuracyMeters + landingAccuracyMeters;
}

function isStoredMeasurement(value: unknown): value is ThrowMeasurement {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ThrowMeasurement>;
  return typeof candidate.id === "string"
    && candidate.id.length > 0
    && candidate.id.length <= 100
    && Number.isFinite(candidate.distanceMeters)
    && Number(candidate.distanceMeters) >= 0
    && Number.isFinite(candidate.distanceFeet)
    && Number(candidate.distanceFeet) >= 0
    && Number.isFinite(candidate.estimatedUncertaintyMeters)
    && Number(candidate.estimatedUncertaintyMeters) >= 0
    && (candidate.confidence === "HIGH" || candidate.confidence === "MEDIUM" || candidate.confidence === "LOW")
    && typeof candidate.measuredAt === "string"
    && Number.isFinite(Date.parse(candidate.measuredAt));
}

function degreesToRadians(value: number): number {
  return value * Math.PI / 180;
}

function createMeasurementId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  fallbackIdCounter += 1;
  return `throw-${Date.now()}-${fallbackIdCounter}`;
}
