import { z } from "zod";

const nullableShortText = (maximum: number) => z.union([
  z.literal(""),
  z.string().trim().max(maximum),
  z.null(),
]).transform((value) => value || null);

export const playerDiscInputSchema = z.object({
  catalogMoldId: z.union([z.string().uuid(), z.literal(""), z.null()]).transform((value) => value || null),
  manufacturerName: z.string().trim().max(100),
  moldName: z.string().trim().max(100),
  manualSpeed: z.number().min(1).max(15).nullable(),
  manualGlide: z.number().min(0).max(7).nullable(),
  manualTurn: z.number().min(-5).max(2).nullable(),
  manualFade: z.number().min(0).max(6).nullable(),
  plastic: nullableShortText(80),
  weightGrams: z.number().int().min(100).max(200).nullable(),
  color: nullableShortText(60),
  nickname: nullableShortText(80),
  condition: z.enum(["NEW", "GOOD", "SEASONED", "BEAT_IN"]),
  wearRating: z.number().int().min(0).max(10),
  domeProfile: z.enum(["FLAT", "NEUTRAL", "DOMEY"]).nullable(),
  runName: nullableShortText(100),
  status: z.enum(["IN_BAG", "STORAGE", "LOST", "RETIRED", "REPLACEMENT_NEEDED"]),
  notes: nullableShortText(1000),
  version: z.number().int().positive().optional(),
}).superRefine((input, context) => {
  if (!input.catalogMoldId && input.manufacturerName.length < 1) {
    context.addIssue({ code: "custom", path: ["manufacturerName"], message: "Enter a manufacturer for a custom disc." });
  }
  if (!input.catalogMoldId && input.moldName.length < 1) {
    context.addIssue({ code: "custom", path: ["moldName"], message: "Enter a mold for a custom disc." });
  }
  if (!input.catalogMoldId && [input.manualSpeed, input.manualGlide, input.manualTurn, input.manualFade].some((value) => value == null)) {
    context.addIssue({ code: "custom", path: ["manualSpeed"], message: "Enter all four printed flight numbers for a custom disc." });
  }
});

export const caddieRequestSchema = z.object({
  distanceFeet: z.number().int().min(50).max(1500),
  windMph: z.number().int().min(0).max(80),
  windDirection: z.enum(["HEADWIND", "TAILWIND", "CROSSWIND", "LEFT_TO_RIGHT", "RIGHT_TO_LEFT", "CALM"]),
  fairwayShape: z.enum(["STRAIGHT", "LEFT", "RIGHT"]),
  throwingHand: z.enum(["RIGHT", "LEFT"]),
  throwType: z.enum(["BACKHAND", "FOREHAND"]),
  controlledDistanceFeet: z.number().int().min(50).max(1000).nullable(),
  riskPreference: z.enum(["CONSERVATIVE", "BALANCED", "AGGRESSIVE"]),
  elevationChangeFeet: z.number().int().min(-1000).max(1000).nullable(),
  groundCondition: z.enum(["NORMAL", "WET", "MUDDY", "SNOW", "ICY"]).nullable(),
  hazardLevel: z.enum(["NONE", "LOW", "MODERATE", "HIGH"]).nullable(),
});

export const caddieFeedbackSchema = z.object({
  playerDiscId: z.string().uuid(),
  throwType: z.enum(["BACKHAND", "FOREHAND"]),
  intendedShape: z.enum(["STRAIGHT", "LEFT", "RIGHT"]),
  result: z.enum(["SUCCESS", "SHORT", "LONG", "OFF_LINE", "OUT_OF_BOUNDS"]),
  flightAdjustment: z.enum(["MORE_UNDERSTABLE", "AS_EXPECTED", "MORE_OVERSTABLE"]),
  missDirection: z.enum(["NONE", "LEFT", "RIGHT", "SHORT", "LONG"]).nullable(),
  distanceFeet: z.number().int().min(1).max(1500).nullable(),
  windMph: z.number().int().min(0).max(80).nullable(),
  windDirection: z.enum(["HEADWIND", "TAILWIND", "CROSSWIND", "LEFT_TO_RIGHT", "RIGHT_TO_LEFT", "CALM"]).nullable(),
  representative: z.boolean(),
  comment: nullableShortText(500),
});

export type PlayerDiscInput = z.infer<typeof playerDiscInputSchema>;
export type CaddieRequestInput = z.infer<typeof caddieRequestSchema>;
export type CaddieFeedbackInput = z.infer<typeof caddieFeedbackSchema>;
