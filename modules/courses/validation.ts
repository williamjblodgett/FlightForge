import { z } from "zod";
import { claimStatusValues } from "./types";

export const courseImportRecordSchema = z.object({
  external_id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(2).max(160),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().length(2),
  country_code: z.string().trim().length(2).default("US"),
  postal_code: z.string().trim().max(16).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  source_name: z.string().trim().min(2).max(160),
  source_url: z.string().url().max(500),
  source_type: z.enum(["COURSE_OWNER", "PUBLIC_AGENCY", "PDGA_DIRECTORY"]),
  claim_status: z.enum(claimStatusValues).default("UNCLAIMED"),
  data_verification_status: z.enum([
    "UNREVIEWED",
    "REVIEWED_SOURCE_ONLY",
    "OPERATOR_VERIFIED",
    "FICTIONAL_DEMO",
  ]),
  last_reviewed_at: z.iso.datetime(),
  is_fictional_demo: z.boolean().default(false),
});

export const courseImportBatchSchema = z.object({
  format_version: z.literal("1.0"),
  batch_id: z.uuid(),
  source_label: z.string().trim().min(2).max(160),
  imported_at: z.iso.datetime(),
  records: z.array(courseImportRecordSchema).min(1).max(5000),
});

const courseEvidenceFieldSchema = z.enum([
  "IDENTITY",
  "LOCATION",
  "ACCESS",
  "SEASON",
  "HOURS",
  "COST",
  "LAYOUT",
  "ACCESSIBILITY",
]);

export const authoritativeRegionalCourseRecordSchema = z.object({
  external_id: z.string().trim().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  name: z.string().trim().min(2).max(160),
  facility_id: z.string().trim().min(2).max(160),
  record_type: z.enum(["COURSE", "FACILITY_COURSE", "LAYOUT"]),
  city: z.string().trim().min(1).max(120),
  state: z.enum(["MA", "NH", "VT", "CT", "RI"]),
  country_code: z.literal("US"),
  postal_code: z.string().trim().max(16).nullable(),
  address_line_1: z.string().trim().max(200).nullable(),
  latitude: z.number().min(40.9).max(45.1),
  longitude: z.number().min(-73.8).max(-69.8),
  location_precision: z.enum(["ENTRANCE_GEOCODED", "FACILITY_GEOCODED", "FACILITY_APPROXIMATE"]),
  hole_count: z.number().int().min(1).max(72),
  operational_status: z.enum(["OPERATOR_CONFIRMED_AVAILABLE", "OPERATOR_CONFIRMED_SEASONAL", "STATUS_UNVERIFIED"]),
  availability_type: z.string().trim().min(2).max(240),
  access: z.string().trim().min(2).max(240),
  cost_note: z.string().trim().min(2).max(240),
  source_name: z.string().trim().min(2).max(160),
  source_url: z.string().url().max(1000),
  source_type: z.enum(["COURSE_OWNER", "PUBLIC_AGENCY"]),
  source_observation: z.string().trim().min(20).max(1000),
  source_checked_at: z.iso.datetime(),
  next_review_due_at: z.iso.datetime(),
  evidence_fields: z.array(courseEvidenceFieldSchema).min(2),
}).superRefine((record, context) => {
  if (new Date(record.next_review_due_at) <= new Date(record.source_checked_at)) {
    context.addIssue({ code: "custom", path: ["next_review_due_at"], message: "Review due date must be later than the source check." });
  }
  if (!record.evidence_fields.includes("IDENTITY") || !record.evidence_fields.includes("LOCATION")) {
    context.addIssue({ code: "custom", path: ["evidence_fields"], message: "Published regional records require identity and location evidence." });
  }
});

export const authoritativeRegionalCourseBatchSchema = z.object({
  format_version: z.literal("2.0"),
  batch_id: z.uuid(),
  source_label: z.string().trim().min(2).max(160),
  generated_at: z.iso.datetime(),
  policy: z.string().trim().min(30),
  candidate_estimates: z.record(z.string(), z.number().int().nonnegative()),
  records: z.array(authoritativeRegionalCourseRecordSchema).min(5).max(5000),
});

export const courseClaimSchema = z.object({
  courseId: z.uuid(),
  applicantName: z.string().trim().min(2).max(120),
  applicantRole: z.string().trim().min(2).max(120),
  businessEmail: z.email().max(254),
  businessPhone: z
    .string()
    .trim()
    .regex(/^[+()\-\s.0-9]{7,30}$/, "Enter a valid business phone number"),
  website: z.union([z.url().max(500), z.literal("")]).transform((value) => value || null),
  explanation: z.string().trim().min(30).max(3000),
});

export const claimReviewSchema = z.object({
  status: z.enum([
    "ADDITIONAL_INFORMATION_REQUIRED",
    "VERIFIED",
    "REJECTED",
    "SUSPENDED",
  ]),
  reason: z.string().trim().min(10).max(2000),
});
