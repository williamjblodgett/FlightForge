import { describe, expect, it } from "vitest";
import { createPasswordRecord, validatePasswordStrength, verifyPassword } from "./password";

describe("password credentials", () => {
  it("derives a salted credential and verifies only the matching password", async () => {
    const record = await createPasswordRecord("TrailBasket2026!");
    expect(record.hash).not.toContain("TrailBasket2026!");
    expect(record.iterations).toBeGreaterThanOrEqual(200_000);
    await expect(verifyPassword("TrailBasket2026!", record)).resolves.toBe(true);
    await expect(verifyPassword("WrongPassword2026!", record)).resolves.toBe(false);
  });

  it("enforces the launch password floor", () => {
    expect(validatePasswordStrength("short1")).toMatch(/12/);
    expect(validatePasswordStrength("letters-only-password")).toMatch(/number/);
    expect(validatePasswordStrength("TrailBasket2026!")).toBeNull();
  });
});
