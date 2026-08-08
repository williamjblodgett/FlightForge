import { expect, test } from "@playwright/test";

test("course discovery keeps filters in the URL and opens an interactive map", async ({ page }) => {
  await page.goto("/courses");
  await page.getByLabel("Search by course, city, or amenity").fill("Sabattus");
  await expect(page).toHaveURL(/q=Sabattus/u);
  await page.getByRole("button", { name: "Map view" }).click();
  await expect(page.getByRole("region", { name: "Interactive map of course results" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Search this area" })).toBeVisible();
});

test("guest score survives refresh and offline scoring announces changes", async ({ page, context }) => {
  await page.goto("/play");
  await page.getByRole("button", { name: "Ace" }).click();
  await expect(page.getByText("Hole 1: 1 strokes", { exact: false })).toBeAttached();
  await page.reload();
  await expect(page.locator(".stroke-control output")).toHaveText("1");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Add one penalty" }).click();
  await expect(page.getByText(/Offline: scoring continues/u)).toBeVisible();
  await context.setOffline(false);
});

test("email verification precedes onboarding", async ({ page, request }) => {
  const email = `browser-${Date.now()}@example.test`;
  const signup = await request.post("/api/auth/signup", { headers: { origin: "http://127.0.0.1:3000" }, data: { displayName: "Browser Player", email, password: "BrowserTrail2026!", acceptTerms: true } });
  expect(signup.status()).toBe(201);
  const body = await signup.json() as { verificationToken: string };
  await page.goto(`/verify-email?token=${encodeURIComponent(body.verificationToken)}`);
  await page.getByRole("button", { name: "Verify email and continue" }).click();
  await expect(page).toHaveURL(/\/onboarding/u);
  await expect(page.getByRole("heading", { name: "Set your game. Set your boundaries." })).toBeVisible();
});

test("video dialog traps context and closes with Escape", async ({ page }) => {
  await page.goto("/play");
  const trigger = page.getByRole("button", { name: "Share video from hole 1" });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Share the shot everyone will remember." })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(trigger).toBeFocused();
});
