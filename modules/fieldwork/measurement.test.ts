import { describe, expect, it } from "vitest";
import {
  appendMeasurement,
  createThrowMeasurement,
  distanceFeet,
  EMPTY_FIELDWORK_SESSION,
  haversineDistanceMeters,
  measurementConfidence,
  readFieldworkSession,
  serializeFieldworkSession,
} from "./measurement";
import type { CapturedPosition } from "./types";

const start: CapturedPosition = {
  latitude: 43.6591,
  longitude: -70.2568,
  accuracyMeters: 3,
  capturedAt: "2026-08-25T12:00:00.000Z",
};

describe("fieldwork GPS measurement", () => {
  it("calculates a known latitude distance with the Haversine formula", () => {
    const distance = haversineDistanceMeters(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
    );
    expect(distance).toBeCloseTo(111_195.08, 0);
    expect(distanceFeet(100)).toBeCloseTo(328.084, 3);
  });

  it("assigns confidence relative to both fix accuracy and throw distance", () => {
    expect(measurementConfidence(100, 3, 4)).toBe("HIGH");
    expect(measurementConfidence(70, 8, 9)).toBe("MEDIUM");
    expect(measurementConfidence(20, 8, 9)).toBe("LOW");
  });

  it("builds and caps a device-local measurement journal", () => {
    let session = { ...EMPTY_FIELDWORK_SESSION };
    for (let index = 0; index < 24; index += 1) {
      const landing = { ...start, longitude: start.longitude + 0.001 + index / 1_000_000 };
      session = appendMeasurement(session, createThrowMeasurement(start, landing, `throw-${index}`));
    }
    expect(session.measurements).toHaveLength(20);
    expect(session.measurements[0]?.id).toBe("throw-23");
  });

  it("rejects corrupt local data without breaking the page", () => {
    expect(readFieldworkSession("not json")).toEqual(EMPTY_FIELDWORK_SESSION);
    expect(readFieldworkSession(JSON.stringify({ version: 2, measurements: [] }))).toEqual(EMPTY_FIELDWORK_SESSION);
  });

  it("restores summaries while discarding any precise coordinates from older local data", () => {
    const landing = { ...start, longitude: start.longitude + 0.001 };
    const measurement = createThrowMeasurement(start, landing, "saved");
    const stored = {
      version: 1,
      searchPosition: start,
      start,
      landing,
      measurements: [measurement],
    };
    const restored = readFieldworkSession(JSON.stringify(stored));
    expect(restored.measurements).toHaveLength(1);
    expect(restored.measurements[0]?.distanceMeters).toBeGreaterThan(70);
    expect(restored.searchPosition).toBeNull();
    expect(restored.start).toBeNull();
    expect(restored.landing).toBeNull();
  });

  it("never serializes precise captured coordinates", () => {
    const landing = { ...start, longitude: start.longitude + 0.001 };
    const session = {
      version: 1 as const,
      searchPosition: start,
      start,
      landing,
      measurements: [createThrowMeasurement(start, landing, "private-location-check")],
    };
    const serialized = serializeFieldworkSession(session);
    expect(serialized).not.toContain("latitude");
    expect(serialized).not.toContain("longitude");
    expect(serialized).not.toContain(String(start.latitude));
    expect(readFieldworkSession(serialized).measurements).toHaveLength(1);
  });
});
