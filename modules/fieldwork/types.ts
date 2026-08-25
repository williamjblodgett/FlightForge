export type GeographicPoint = {
  latitude: number;
  longitude: number;
};

export type CapturedPosition = GeographicPoint & {
  accuracyMeters: number;
  capturedAt: string;
};

export type MeasurementConfidence = "HIGH" | "MEDIUM" | "LOW";

export type ThrowMeasurement = {
  id: string;
  distanceMeters: number;
  distanceFeet: number;
  estimatedUncertaintyMeters: number;
  confidence: MeasurementConfidence;
  measuredAt: string;
};

export type FieldworkSession = {
  version: 1;
  searchPosition: CapturedPosition | null;
  start: CapturedPosition | null;
  landing: CapturedPosition | null;
  measurements: ThrowMeasurement[];
};

export type PracticeCandidate = {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  holeCount: number;
  accessLabel: string;
  statusLabel: string;
  visitNote: string;
  sourceName: string;
  sourceUrl: string;
  isPublicProperty: boolean;
  locationNote: string;
};

export type NearbyPracticeCandidate = PracticeCandidate & {
  distanceMeters: number;
  distanceMiles: number;
};
