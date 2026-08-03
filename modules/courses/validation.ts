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
