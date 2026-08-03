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
import { brand } from "@/config/brand";

export type DemoGame = {
  id: string;
  courseId: string;
  startsAt: string;
  seatsOpen: number;
  pace: "RELAXED" | "STEADY" | "FAST";
  skill: string;
  approvalRequired: boolean;
  joined: boolean;
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
  schemaVersion: 2;
  displayName: string;
  favorites: string[];
  reservations: Reservation[];
  games: DemoGame[];
  rounds: RoundSnapshot[];
  activeRoundId: string | null;
  discs: PlayerDisc[];
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
  update: (updater: (current: DemoState) => DemoState) => void;
  reset: () => void;
};

const storageKey = `${brand.shortProductName.toLowerCase()}-pages-demo-v2`;

export const initialDiscs: PlayerDisc[] = [
  { id: "disc-1", manufacturer: "Latitude 64", mold: "River", speed: 7, glide: 7, turn: -1, fade: 1, stability: "UNDERSTABLE", inBag: true },
  { id: "disc-2", manufacturer: "Innova", mold: "Teebird", speed: 7, glide: 5, turn: 0, fade: 2, stability: "STABLE", inBag: true },
  { id: "disc-3", manufacturer: "Discraft", mold: "Raptor", speed: 9, glide: 4, turn: 0, fade: 3, stability: "OVERSTABLE", inBag: true },
  { id: "disc-4", manufacturer: "Discraft", mold: "Buzzz", speed: 5, glide: 4, turn: -1, fade: 1, stability: "STABLE", inBag: true },
  { id: "disc-5", manufacturer: "Axiom", mold: "Envy", speed: 3, glide: 3, turn: 0, fade: 2, stability: "STABLE", inBag: true },
];

const initialGames: DemoGame[] = [
  { id: "game-1", courseId: "20000000-0000-4000-8000-000000000009", startsAt: "2026-08-08T14:20:00.000Z", seatsOpen: 2, pace: "STEADY", skill: "Any skill", approvalRequired: false, joined: false },
  { id: "game-2", courseId: "20000000-0000-4000-8000-000000000002", startsAt: "2026-08-09T13:00:00.000Z", seatsOpen: 1, pace: "RELAXED", skill: "Beginner-friendly", approvalRequired: true, joined: false },
];

const initialState: DemoState = {
  schemaVersion: 2,
  displayName: "Recreational Player",
  favorites: ["20000000-0000-4000-8000-000000000002"],
  reservations: [],
  games: initialGames,
  rounds: [],
  activeRoundId: null,
  discs: initialDiscs,
  eventRegistrations: [],
  conditions: { "20000000-0000-4000-8000-000000000009": "Open · Dry fairways" },
  importBatches: [],
  claims: [
    {
      id: "61000000-0000-4000-8000-000000000001",
      courseId: "20000000-0000-4000-8000-000000000002",
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
  id: z.string(), manufacturer: z.string(), mold: z.string(), speed: z.number(), glide: z.number(),
  turn: z.number(), fade: z.number(), stability: z.enum(["UNDERSTABLE", "STABLE", "OVERSTABLE"]), inBag: z.boolean(),
});
const holeSchema = z.object({ hole: z.number().int(), par: z.number().int(), score: z.number().int().nullable(), updatedAt: z.string().nullable() });
const roundSchema = z.object({ id: z.string(), courseId: z.string(), status: z.enum(["IN_PROGRESS", "COMPLETED"]), version: z.number().int(), holes: z.array(holeSchema) });
const gameSchema = z.object({ id: z.string(), courseId: z.string(), startsAt: z.string(), seatsOpen: z.number().int(), pace: z.enum(["RELAXED", "STEADY", "FAST"]), skill: z.string(), approvalRequired: z.boolean(), joined: z.boolean() });
const importBatchSchema = z.object({ id: z.string(), sourceName: z.string(), recordCount: z.number().int(), appliedAt: z.string(), rolledBackAt: z.string().nullable() });
const claimStatusSchema = z.enum(["CLAIM_SUBMITTED", "ADDITIONAL_INFORMATION_REQUIRED", "VERIFIED", "REJECTED", "SUSPENDED"]);
const claimAuditSchema = z.object({ id: z.string(), action: z.enum(["SUBMITTED", "REVIEWED"]), fromStatus: claimStatusSchema.nullable(), toStatus: claimStatusSchema, reason: z.string(), actor: z.string(), createdAt: z.string() });
const claimSchema = z.object({ id: z.string(), courseId: z.string(), applicantName: z.string(), applicantRole: z.string(), businessEmail: z.string(), businessPhone: z.string(), website: z.string().nullable(), explanation: z.string(), evidenceValidated: z.boolean(), status: claimStatusSchema, version: z.number().int().positive(), createdAt: z.string(), audit: z.array(claimAuditSchema) });
const stateSchema = z.object({
  schemaVersion: z.literal(2), displayName: z.string(), favorites: z.array(z.string()),
  reservations: z.array(reservationSchema), games: z.array(gameSchema), rounds: z.array(roundSchema),
  activeRoundId: z.string().nullable(), discs: z.array(discSchema), eventRegistrations: z.array(z.string()),
  conditions: z.record(z.string(), z.string()), importBatches: z.array(importBatchSchema), claims: z.array(claimSchema),
  notificationCount: z.number().int().nonnegative(), lastSavedAt: z.string().nullable(),
});

const DemoStoreContext = createContext<DemoStoreValue | null>(null);

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(() => {
    if (typeof window === "undefined") return initialState;

    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const result = stateSchema.safeParse(JSON.parse(saved) as unknown);
        if (result.success) return result.data;
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }

    return initialState;
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
    setState(initialState);
  }, []);

  const value = useMemo(() => ({ state, hydrated, update, reset }), [state, hydrated, update, reset]);
  return <DemoStoreContext.Provider value={value}>{children}</DemoStoreContext.Provider>;
}

export function useDemoStore(): DemoStoreValue {
  const value = useContext(DemoStoreContext);
  if (!value) throw new Error("useDemoStore must be used inside DemoStoreProvider");
  return value;
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
