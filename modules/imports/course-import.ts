import type { z } from "zod";
import { courseImportBatchSchema, courseImportRecordSchema } from "@/modules/courses/validation";

export type CourseImportRecord = z.infer<typeof courseImportRecordSchema>;
export type CourseImportBatch = z.infer<typeof courseImportBatchSchema>;

export type DuplicateCandidate = {
  leftExternalId: string;
  rightExternalId: string;
  reason: "SAME_SOURCE_ID" | "SAME_NORMALIZED_NAME_AND_CITY" | "NEARBY_SAME_NAME";
};

export function normalizeCourseIdentity(value: string): string {
  return value
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, " ")
    .trim();
}

export function detectDuplicateCandidates(
  records: CourseImportRecord[],
): DuplicateCandidate[] {
  const duplicates: DuplicateCandidate[] = [];
  for (let leftIndex = 0; leftIndex < records.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < records.length; rightIndex += 1) {
      const left = records[leftIndex];
      const right = records[rightIndex];
      if (left.external_id === right.external_id) {
        duplicates.push({
          leftExternalId: left.external_id,
          rightExternalId: right.external_id,
          reason: "SAME_SOURCE_ID",
        });
        continue;
      }
      const sameName = normalizeCourseIdentity(left.name) === normalizeCourseIdentity(right.name);
      const sameCity = normalizeCourseIdentity(left.city) === normalizeCourseIdentity(right.city);
      if (sameName && sameCity && left.state === right.state) {
        duplicates.push({
          leftExternalId: left.external_id,
          rightExternalId: right.external_id,
          reason: "SAME_NORMALIZED_NAME_AND_CITY",
        });
        continue;
      }
      if (
        sameName &&
        left.latitude != null &&
        left.longitude != null &&
        right.latitude != null &&
        right.longitude != null &&
        distanceMiles(left.latitude, left.longitude, right.latitude, right.longitude) < 0.5
      ) {
        duplicates.push({
          leftExternalId: left.external_id,
          rightExternalId: right.external_id,
          reason: "NEARBY_SAME_NAME",
        });
      }
    }
  }
  return duplicates;
}

function distanceMiles(
  firstLatitude: number,
  firstLongitude: number,
  secondLatitude: number,
  secondLongitude: number,
): number {
  const earthRadiusMiles = 3958.8;
  const latitudeDelta = radians(secondLatitude - firstLatitude);
  const longitudeDelta = radians(secondLongitude - firstLongitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(firstLatitude)) *
      Math.cos(radians(secondLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function radians(value: number): number {
  return (value * Math.PI) / 180;
}
