import type { Course } from "@/modules/courses/types";
import { haversineDistanceMeters } from "./measurement";
import type { GeographicPoint, NearbyPracticeCandidate, PracticeCandidate } from "./types";

const PUBLIC_ACCESS_PATTERN = /\beveryone\b|\bpublic\b|\bmunicipal\b|\bstate park\b|\bfederal recreation\b/iu;
const RESTRICTED_ACCESS_PATTERN = /\blimited access\b|\bprivate course\b|\bmembers? only\b/iu;

export function toPracticeCandidate(course: Course): PracticeCandidate | null {
  const access = course.access?.trim() ?? "Access details not listed";
  if (course.holeCount < 9
    || course.operationalStatus === "UNAVAILABLE_REPORTED"
    || course.operationalStatus === "STATUS_UNVERIFIED"
    || RESTRICTED_ACCESS_PATTERN.test(access)
    || !PUBLIC_ACCESS_PATTERN.test(access)) return null;

  const isPublicProperty = course.sourceType === "PUBLIC_AGENCY"
    && /\bmunicipal\b|\bstate park\b|\bfederal\b|\bcity of\b|\btown of\b|\bpublic park\b/iu.test(access);
  return {
    id: course.id,
    slug: course.slug,
    name: course.name,
    city: course.city,
    state: course.state,
    latitude: course.latitude,
    longitude: course.longitude,
    holeCount: course.holeCount,
    accessLabel: access,
    statusLabel: statusLabel(course.operationalStatus),
    visitNote: visitNote(course),
    sourceName: course.sourceName,
    sourceUrl: course.sourceUrl,
    isPublicProperty,
    locationNote: locationNote(course.locationPrecision),
  };
}

export function buildPracticeCandidates(courses: Course[]): PracticeCandidate[] {
  return courses.flatMap((course) => {
    const candidate = toPracticeCandidate(course);
    return candidate ? [candidate] : [];
  });
}

export function nearestPracticeCandidates(
  candidates: PracticeCandidate[],
  origin: GeographicPoint,
  limit = 8,
): NearbyPracticeCandidate[] {
  if (!Number.isInteger(limit) || limit < 0) throw new RangeError("Candidate limit must be a non-negative integer.");
  return candidates
    .map((candidate) => {
      const distanceMeters = haversineDistanceMeters(origin, candidate);
      return { ...candidate, distanceMeters, distanceMiles: distanceMeters / 1_609.344 };
    })
    .sort((left, right) => left.distanceMeters - right.distanceMeters
      || Number(right.isPublicProperty) - Number(left.isPublicProperty)
      || left.name.localeCompare(right.name))
    .slice(0, limit);
}

function statusLabel(status: Course["operationalStatus"]): string {
  if (status === "OPERATOR_CONFIRMED_AVAILABLE") return "Public access listed by the operator";
  if (status === "OPERATOR_CONFIRMED_SEASONAL") return "Seasonal public access listed by the operator";
  if (status === "SEASONAL_AVAILABLE") return "Seasonal access reported";
  return "Public access reported";
}

function visitNote(course: Course): string {
  if (course.operationalStatus === "OPERATOR_CONFIRMED_SEASONAL" || course.operationalStatus === "SEASONAL_AVAILABLE") {
    return "Seasonal property—confirm today’s hours and field rules before leaving.";
  }
  if (course.evidenceStatus !== "CURRENT") {
    return "The listing is due for a refresh—confirm access and practice rules before leaving.";
  }
  if (course.priceType === "PAID") {
    return "Publicly accessible, but a fee or check-in may be required. Ask where fieldwork is permitted.";
  }
  return "Confirm that an open, designated practice area is available before throwing.";
}

function locationNote(precision: Course["locationPrecision"]): string {
  if (precision === "ENTRANCE_GEOCODED") return "Directions use the listed entrance location.";
  if (precision === "FACILITY_GEOCODED") return "Directions use the listed facility location.";
  return "The map point is approximate—verify the entrance before traveling.";
}
