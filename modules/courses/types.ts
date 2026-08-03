export const claimStatusValues = [
  "UNCLAIMED",
  "CLAIM_SUBMITTED",
  "ADDITIONAL_INFORMATION_REQUIRED",
  "VERIFIED",
  "REJECTED",
  "SUSPENDED",
] as const;

export type ClaimStatus = (typeof claimStatusValues)[number];

export type CourseDifficulty =
  | "BEGINNER"
  | "RECREATIONAL"
  | "INTERMEDIATE"
  | "ADVANCED";

export type CoursePriceType = "FREE" | "PAID" | "MIXED";

export type Course = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  city: string;
  state: string;
  countryCode: string;
  postalCode: string | null;
  addressLine1: string | null;
  latitude: number;
  longitude: number;
  holeCount: number;
  layoutCount: number;
  difficulty: CourseDifficulty;
  terrain: string[];
  amenities: string[];
  priceType: CoursePriceType;
  priceFromCents: number | null;
  claimStatus: ClaimStatus;
  dataVerificationStatus: "REVIEWED_SOURCE_ONLY" | "FICTIONAL_DEMO";
  lastReviewedAt: string;
  sourceName: string;
  sourceUrl: string;
  sourceType: "COURSE_OWNER" | "PUBLIC_AGENCY" | "PDGA_DIRECTORY";
  verifiedBadge: boolean;
  fictionalDemo: boolean;
  currentCondition: string | null;
  conditionSource: "COURSE_REPORTED" | "DEMO" | null;
  nextAvailableAt: string | null;
  heroTone: "pine" | "lake" | "sunrise" | "granite" | "meadow";
};

export type CourseClaimApplication = {
  courseId: string;
  applicantName: string;
  applicantRole: string;
  businessEmail: string;
  businessPhone: string;
  website: string | null;
  explanation: string;
};
