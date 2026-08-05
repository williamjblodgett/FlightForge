import { z } from "zod";

export const discCategoryValues = [
  "PUTTER",
  "APPROACH",
  "MIDRANGE",
  "FAIRWAY_DRIVER",
  "DISTANCE_DRIVER",
] as const;

export const catalogDiscRecordSchema = z.object({
  id: z.string().uuid(),
  manufacturer: z.object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(100),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    website: z.string().url(),
  }),
  mold: z.string().trim().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  category: z.enum(discCategoryValues),
  ratings: z.object({
    speed: z.number().min(1).max(15),
    glide: z.number().min(0).max(7),
    turn: z.number().min(-5).max(2),
    fade: z.number().min(0).max(6),
    system: z.string().trim().min(1).max(80),
    effective_from: z.string().date(),
  }),
  plastics: z.array(z.string().trim().min(1).max(80)).max(20),
  source: z.object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    url: z.string().url(),
    checked_at: z.string().datetime(),
    license_note: z.string().trim().max(500),
  }),
  approved_reference: z.string().url(),
});

export const discCatalogImportSchema = z.object({
  format_version: z.literal("1.0"),
  batch_id: z.string().uuid(),
  source_label: z.string().trim().min(1).max(200),
  reviewed_at: z.string().datetime(),
  records: z.array(catalogDiscRecordSchema).min(1).max(5000),
}).superRefine((batch, context) => {
  const identities = new Set<string>();
  for (const [index, record] of batch.records.entries()) {
    const identity = `${record.manufacturer.slug}:${record.slug}`;
    if (identities.has(identity)) {
      context.addIssue({
        code: "custom",
        path: ["records", index, "mold"],
        message: `Duplicate manufacturer and mold identity: ${identity}`,
      });
    }
    identities.add(identity);
  }
});

export type DiscCatalogImport = z.infer<typeof discCatalogImportSchema>;
export type CatalogDiscRecord = z.infer<typeof catalogDiscRecordSchema>;
