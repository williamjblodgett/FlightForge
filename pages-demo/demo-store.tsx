"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { z } from "zod";
import type { Reservation } from "@/modules/bookings/booking-engine";
import type { PlayerDisc } from "@/modules/bags/bag-intelligence";
import type { RoundSnapshot } from "@/modules/rounds/round-engine";
import { fictionalDemoCourse } from "@/modules/courses/fictional-demo-course";
import { brand } from "@/config/brand";

export type DemoGame = {
  id: string;
  courseId: string;
  startsAt: string;
  seatsOpen: number;
  pace: "RELAXED" | "STEADY" | "FAST";
  skill: string;
  approvalRequired: boolean;
  visibility: "PUBLIC" | "PRIVATE";
  notes: string;
  joined: boolean;
};

export type DemoProfile = {
  homeCity: string;
  homeRegionCode: string;
  experienceLevel: "NEW" | "BEGINNER" | "RECREATIONAL" | "INTERMEDIATE" | "ADVANCED";
  throwingHand: "RIGHT" | "LEFT" | "AMBIDEXTROUS" | "PREFER_NOT_TO_SAY";
};

export type DemoPrivacySettings = {
  profileVisibility: "PRIVATE" | "FRIENDS" | "PUBLIC";
  socialMatchmaking: boolean;
  analyticsOptIn: boolean;
  aiRecommendations: boolean;
};

export type DemoHoleDetail = {
  discId: string | null;
  shotType: string;
  landingResult: string;
  penaltyStrokes: number;
  notes: string;
};

export type DemoImportBatch = {
  id: string;
  sourceName: string;
  recordCount: number;
  appliedAt: string;
  rolledBackAt: string | null;
};

export type DemoClaimStatus =
  | "CLAIM_SUBMITTED"
  | "ADDITIONAL_INFORMATION_REQUIRED"
  | "VERIFIED"
  | "REJECTED"
  | "SUSPENDED";

export type DemoClaimAudit = {
  id: string;
  action: "SUBMITTED" | "REVIEWED";
  fromStatus: DemoClaimStatus | null;
  toStatus: DemoClaimStatus;
  reason: string;
  actor: string;
  createdAt: string;
};

export type DemoClaim = {
  id: string;
  courseId: string;
  applicantName: string;
  applicantRole: string;
  businessEmail: string;
  businessPhone: string;
  website: string | null;
  explanation: string;
  evidenceValidated: boolean;
  status: DemoClaimStatus;
  version: number;
  createdAt: string;
  audit: DemoClaimAudit[];
};

export type DemoState = {
  schemaVersion: 3;
  displayName: string;
  profile: DemoProfile;
  privacy: DemoPrivacySettings;
  favorites: string[];
  reservations: Reservation[];
  games: DemoGame[];
  rounds: RoundSnapshot[];
  activeRoundId: string | null;
  roundDetails: Record<string, Record<string, DemoHoleDetail>>;
  discs: PlayerDisc[];
  lessonProgress: Record<string, number>;
  eventRegistrations: string[];
  conditions: Record<string, string>;
  importBatches: DemoImportBatch[];
  claims: DemoClaim[];
  notificationCount: number;
  lastSavedAt: string | null;
};

type DemoStoreValue = {
  state: DemoState;
  hydrated: boolean;
  signedIn: boolean;
  update: (updater: (current: DemoState) => DemoState) => void;
  reset: () => void;
  signOut: () => void;
  startSession: () => void;
};

const storageKey = `${brand.shortProductName.toLowerCase()}-pages-demo-v3`;
const legacyStorageKey = `${brand.shortProductName.toLowerCase()}-pages-demo-v2`;
const sessionKey = `${brand.shortProductName.toLowerCase()}-pages-demo-session`;

export const initialDiscs: PlayerDisc[] = [
  { id: "disc-1", manufacturer: "Latitude 64", mold: "River", speed: 7, glide: 7, turn: -1, fade: 1, stability: "UNDERSTABLE", inBag: true },
  { id: "disc-2", manufacturer: "Innova", mold: "Teebird", speed: 7, glide: 5, turn: 0, fade: 2, stability: "STABLE", inBag: true },
  { id: "disc-3", manufacturer: "Discraft", mold: "Raptor", speed: 9, glide: 4, turn: 0, fade: 3, stability: "OVERSTABLE", inBag: true },
  { id: "disc-4", manufacturer: "Discraft", mold: "Buzzz", speed: 5, glide: 4, turn: -1, fade: 1, stability: "STABLE", inBag: true },
  { id: "disc-5", manufacturer: "Axiom", mold: "Envy", speed: 3, glide: 3, turn: 0, fade: 2, stability: "STABLE", inBag: true },
];

const initialGames: DemoGame[] = [
  { id: "game-1", courseId: fictionalDemoCourse.id, startsAt: "2026-08-08T14:20:00.000Z", seatsOpen: 2, pace: "STEADY", skill: "Any skill", approvalRequired: false, visibility: "PUBLIC", notes: "Fictional open card for product testing.", joined: false },
  { id: "game-2", courseId: fictionalDemoCourse.id, startsAt: "2026-08-09T13:00:00.000Z", seatsOpen: 1, pace: "RELAXED", skill: "Beginner-friendly", approvalRequired: true, visibility: "PUBLIC", notes: "Beginners welcome. Fictional demonstration only.", joined: false },
];

export const initialDemoState: DemoState = {
  schemaVersion: 3,
  displayName: "Recreational Player",
  profile: {
    homeCity: "Portland",
    homeRegionCode: "ME",
    experienceLevel: "RECREATIONAL",
    throwingHand: "RIGHT",
  },
  privacy: {
    profileVisibility: "FRIENDS",
    socialMatchmaking: true,
    analyticsOptIn: false,
    aiRecommendations: true,
  },
  favorites: ["course-sabattus-disc-golf-eagle"],
  reservations: [],
  games: initialGames,
  rounds: [],
  activeRoundId: null,
  roundDetails: {},
  discs: initialDiscs,
  lessonProgress: { "confident-first-round": 72, "shape-the-fairway": 34, "putting-reset": 50 },
  eventRegistrations: [],
  conditions: { [fictionalDemoCourse.id]: "Open · Fictional dry fairways" },
  importBatches: [],
  claims: [
    {
      id: "61000000-0000-4000-8000-000000000001",
      courseId: fictionalDemoCourse.id,
      applicantName: "Fictional Operations Manager",
      applicantRole: "Course manager",
      businessEmail: "manager@example.invalid",
      businessPhone: "+1 207 555 0142",
      website: "https://example.invalid",
      explanation: "Fictional demonstration submission used only to exercise the administrator review and audit workflow.",
      evidenceValidated: true,
      status: "CLAIM_SUBMITTED",
      version: 1,
      createdAt: "2026-08-02T15:00:00.000Z",
      audit: [
        {
          id: "62000000-0000-4000-8000-000000000001",
          action: "SUBMITTED",
          fromStatus: null,
          toStatus: "CLAIM_SUBMITTED",
          reason: "Fictional demonstration claim submitted by applicant.",
          actor: "manager@example.invalid",
          createdAt: "2026-08-02T15:00:00.000Z",
        },
      ],
    },
  ],
  notificationCount: 3,
  lastSavedAt: null,
};

const reservationSchema = z.object({
  id: z.string(), quoteId: z.string(), idempotencyKey: z.string(), courseId: z.string(),
  date: z.string(), time: z.string(), playerCount: z.number().int().positive(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]), totalCents: z.number().int().nonnegative(),
  status: z.literal("CONFIRMED"), createdAt: z.string(),
});
const discSchema = z.object({
  id: z.string(), manufacturer: z.string(), mold: z.string(), plastic: z.string().optional(),
  weightGrams: z.number().optional(), color: z.string().optional(), nickname: z.string().optional(),
  speed: z.number(), glide: z.number(),
  turn: z.number(), fade: z.number(), stability: z.enum(["UNDERSTABLE", "STABLE", "OVERSTABLE"]), inBag: z.boolean(),
});
const holeSchema = z.object({ hole: z.number().int(), par: z.number().int(), score: z.number().int().nullable(), updatedAt: z.string().nullable() });
const roundSchema = z.object({ id: z.string(), courseId: z.string(), status: z.enum(["IN_PROGRESS", "COMPLETED"]), version: z.number().int(), holes: z.array(holeSchema) });
const gameSchema = z.object({ id: z.string(), courseId: z.string(), startsAt: z.string(), seatsOpen: z.number().int(), pace: z.enum(["RELAXED", "STEADY", "FAST"]), skill: z.string(), approvalRequired: z.boolean(), visibility: z.enum(["PUBLIC", "PRIVATE"]), notes: z.string(), joined: z.boolean() });
const profileSchema = z.object({ homeCity: z.string(), homeRegionCode: z.string(), experienceLevel: z.enum(["NEW", "BEGINNER", "RECREATIONAL", "INTERMEDIATE", "ADVANCED"]), throwingHand: z.enum(["RIGHT", "LEFT", "AMBIDEXTROUS", "PREFER_NOT_TO_SAY"]) });
const privacySchema = z.object({ profileVisibility: z.enum(["PRIVATE", "FRIENDS", "PUBLIC"]), socialMatchmaking: z.boolean(), analyticsOptIn: z.boolean(), aiRecommendations: z.boolean() });
const holeDetailSchema = z.object({ discId: z.string().nullable(), shotType: z.string(), landingResult: z.string(), penaltyStrokes: z.number().int().min(0).max(10), notes: z.string() });
const importBatchSchema = z.object({ id: z.string(), sourceName: z.string(), recordCount: z.number().int(), appliedAt: z.string(), rolledBackAt: z.string().nullable() });
const claimStatusSchema = z.enum(["CLAIM_SUBMITTED", "ADDITIONAL_INFORMATION_REQUIRED", "VERIFIED", "REJECTED", "SUSPENDED"]);
const claimAuditSchema = z.object({ id: z.string(), action: z.enum(["SUBMITTED", "REVIEWED"]), fromStatus: claimStatusSchema.nullable(), toStatus: claimStatusSchema, reason: z.string(), actor: z.string(), createdAt: z.string() });
const claimSchema = z.object({ id: z.string(), courseId: z.string(), applicantName: z.string(), applicantRole: z.string(), businessEmail: z.string(), businessPhone: z.string(), website: z.string().nullable(), explanation: z.string(), evidenceValidated: z.boolean(), status: claimStatusSchema, version: z.number().int().positive(), createdAt: z.string(), audit: z.array(claimAuditSchema) });
const stateSchema = z.object({
  schemaVersion: z.literal(3), displayName: z.string(), profile: profileSchema, privacy: privacySchema, favorites: z.array(z.string()),
  reservations: z.array(reservationSchema), games: z.array(gameSchema), rounds: z.array(roundSchema),
  activeRoundId: z.string().nullable(), roundDetails: z.record(z.string(), z.record(z.string(), holeDetailSchema)), discs: z.array(discSchema), lessonProgress: z.record(z.string(), z.number().int().min(0).max(100)), eventRegistrations: z.array(z.string()),
  conditions: z.record(z.string(), z.string()), importBatches: z.array(importBatchSchema), claims: z.array(claimSchema),
  notificationCount: z.number().int().nonnegative(), lastSavedAt: z.string().nullable(),
});

const DemoStoreContext = createContext<DemoStoreValue | null>(null);

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(() => {
    if (typeof window === "undefined") return initialDemoState;

    try {
      const saved = window.localStorage.getItem(storageKey) ?? window.localStorage.getItem(legacyStorageKey);
      if (saved) {
        const restored = restoreDemoState(JSON.parse(saved) as unknown);
        if (restored) {
          window.localStorage.setItem(storageKey, JSON.stringify(restored));
          window.localStorage.removeItem(legacyStorageKey);
          return restored;
        }
      }
    } catch {
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem(legacyStorageKey);
    }

    return initialDemoState;
  });
  const [signedIn, setSignedIn] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.sessionStorage.getItem(sessionKey) !== "signed-out";
  });
  const hydrated = true;

  const update = useCallback((updater: (current: DemoState) => DemoState) => {
    setState((current) => {
      const next = { ...updater(current), lastSavedAt: new Date().toISOString() };
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(legacyStorageKey);
    setState(initialDemoState);
  }, []);

  const signOut = useCallback(() => {
    window.sessionStorage.setItem(sessionKey, "signed-out");
    setSignedIn(false);
  }, []);

  const startSession = useCallback(() => {
    window.sessionStorage.removeItem(sessionKey);
    setSignedIn(true);
  }, []);

  const value = useMemo(
    () => ({ state, hydrated, signedIn, update, reset, signOut, startSession }),
    [state, hydrated, signedIn, update, reset, signOut, startSession],
  );
  return <DemoStoreContext.Provider value={value}>{children}</DemoStoreContext.Provider>;
}

export function useDemoStore(): DemoStoreValue {
  const value = useContext(DemoStoreContext);
  if (!value) throw new Error("useDemoStore must be used inside DemoStoreProvider");
  return value;
}

export function restoreDemoState(value: unknown): DemoState | null {
  const direct = stateSchema.safeParse(value);
  if (direct.success) return direct.data;
  if (!value || typeof value !== "object" || (value as { schemaVersion?: unknown }).schemaVersion !== 2) return null;

  const legacy = value as Record<string, unknown>;
  const migrated = {
    ...legacy,
    schemaVersion: 3,
    profile: initialDemoState.profile,
    privacy: initialDemoState.privacy,
    reservations: Array.isArray(legacy.reservations)
      ? legacy.reservations.map((reservation) => ({ ...(reservation as object), courseId: fictionalDemoCourse.id }))
      : [],
    games: Array.isArray(legacy.games)
      ? legacy.games.map((game) => ({ ...(game as object), courseId: fictionalDemoCourse.id, visibility: "PUBLIC", notes: "Migrated fictional demonstration group." }))
      : initialGames,
    rounds: Array.isArray(legacy.rounds)
      ? legacy.rounds.map((round) => ({ ...(round as object), courseId: fictionalDemoCourse.id }))
      : [],
    roundDetails: {},
    lessonProgress: { "confident-first-round": 72, "shape-the-fairway": 34, "putting-reset": 50 },
    conditions: { [fictionalDemoCourse.id]: "Open · Fictional dry fairways" },
    claims: Array.isArray(legacy.claims)
      ? legacy.claims.map((claim) => {
          const record = claim as { courseId?: unknown } & Record<string, unknown>;
          return /^20000000-/u.test(String(record.courseId ?? ""))
            ? { ...record, courseId: fictionalDemoCourse.id }
            : record;
        })
      : initialDemoState.claims,
  };
  const result = stateSchema.safeParse(migrated);
  return result.success ? result.data : null;
}

export function downloadDemoData(state: DemoState): void {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data: state }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${brand.productName.toLowerCase().replace(/[^a-z0-9]+/gu, "-")}-personal-data.json`;
  link.click();
  URL.revokeObjectURL(url);
}
