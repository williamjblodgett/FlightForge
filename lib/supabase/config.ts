import { z } from "zod";

const urlSchema = z.string().url().refine((value) => value.startsWith("https://"), "Supabase URL must use HTTPS.");
export type SupabaseConfiguration = { url: string; publishableKey: string; serviceRoleKey: string | null };

export function getSupabaseConfiguration(): SupabaseConfiguration | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  const parsed = urlSchema.safeParse(url);
  if (!parsed.success) throw new Error("NEXT_PUBLIC_SUPABASE_URL is invalid.");
  return { url: parsed.data, publishableKey, serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? null };
}
export function isSupabaseConfigured(): boolean { return getSupabaseConfiguration() !== null; }
