import { afterEach, describe, expect, it } from "vitest";
import { getSupabaseConfiguration } from "./config";

const original = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, service: process.env.SUPABASE_SERVICE_ROLE_KEY };

afterEach(() => {
  restore("NEXT_PUBLIC_SUPABASE_URL", original.url);
  restore("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", original.key);
  restore("SUPABASE_SERVICE_ROLE_KEY", original.service);
});

describe("getSupabaseConfiguration", () => {
  it("returns null until the public pair is complete", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(getSupabaseConfiguration()).toBeNull();
  });

  it("keeps the service role separate from public configuration", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "public-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "server-secret";
    expect(getSupabaseConfiguration()).toEqual({ url: "https://project.supabase.co", publishableKey: "public-key", serviceRoleKey: "server-secret" });
  });

  it("rejects non-HTTPS project URLs", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "public-key";
    expect(() => getSupabaseConfiguration()).toThrow("invalid");
  });
});

function restore(name: string, value: string | undefined) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
