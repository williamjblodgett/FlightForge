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
  | "UNRATED"
  | "BEGINNER"
  | "RECREATIONAL"
  | "INTERMEDIATE"
  | "ADVANCED";

export type CoursePriceType = "FREE" | "PAID" | "MIXED";

export type CourseOperationalStatus =
  | "OPERATOR_CONFIRMED_AVAILABLE"
  | "OPERATOR_CONFIRMED_SEASONAL"
  | "AVAILABLE_REPORTED"
  | "SEASONAL_AVAILABLE"
  | "UNAVAILABLE_REPORTED"
  | "STATUS_UNVERIFIED";

export type CourseSource = {
  name: string;
  url: string;
  type: "COURSE_OWNER" | "PUBLIC_AGENCY" | "PDGA_DIRECTORY" | "PUBLIC_DIRECTORY";
  observation: string | null;
  checkedAt: string;
  authoritative: boolean;
};

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
  dataVerificationStatus:
    | "SOURCE_REVIEW_REQUIRED"
    | "DIRECTORY_CROSS_CHECKED"
    | "OPERATOR_SOURCE_REVIEWED"
    | "FICTIONAL_DEMO";
  lastReviewedAt: string;
  sourceName: string;
  sourceUrl: string;
  sourceType: CourseSource["type"];
  sources: CourseSource[];
  operationalStatus: CourseOperationalStatus;
  availabilityType: string | null;
  verificationLevel:
    | "DIRECTORY_SINGLE_SOURCE"
    | "DIRECTORY_CROSS_CHECKED"
    | "OPERATOR_SOURCE_REVIEWED";
  access: string | null;
  costNote: string | null;
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
