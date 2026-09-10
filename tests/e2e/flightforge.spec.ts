import { expect, test } from "@playwright/test";

test("course discovery keeps filters in the URL and opens an interactive map", async ({ page }) => {
  await page.goto("/courses");
  const search = page.getByLabel("Search by course, city, or amenity");
  await search.fill("Sabattus");
  await page.getByRole("button",{name:"Search",exact:true}).click();
  await expect(page).toHaveURL(/q=Sabattus/u);
  await expect(search).toHaveValue("Sabattus");
  await page.getByRole("button", { name: "Map view" }).click();
  await expect(page.getByRole("region", { name: "Interactive map of course results" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Search this area" })).toBeVisible();
});

test("tablet discovery gives course cards the full content width", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/courses");
  const firstCard = page.locator(".course-card").first();
  await expect(firstCard).toBeVisible();
  const cardBounds = await firstCard.boundingBox();
  expect(cardBounds).not.toBeNull();
  expect(cardBounds!.width).toBeGreaterThan(400);
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("guest score survives refresh and offline scoring announces changes", async ({ page, context }) => {
  await page.goto("/play?eventId=flightforge-demo-event");
  await page.getByRole("button", { name: "Ace" }).click();
  await expect(page.getByText("Hole 1: 1 strokes", { exact: false })).toBeAttached();
  await page.reload();
  await expect(page.getByLabel("Strokes for hole 1")).toHaveValue("1");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Add one penalty to hole 1" }).click();
  await expect(page.getByText(/Offline · \d+ changes? saved on this device\. Scoring can continue\./u)).toBeVisible();
  await context.setOffline(false);
});

test("email verification precedes onboarding", async ({ page, request }, testInfo) => {
  const email = `browser-${Date.now()}@example.test`;
  const origin = new URL(String(testInfo.project.use.baseURL)).origin;
  const signup = await request.post("/api/auth/signup", { headers: { origin, "cf-connecting-ip": `2001:db8::${Date.now().toString(16)}` }, data: { displayName: "Browser Player", email, password: "BrowserTrail2026!", acceptTerms: true } });
  expect(signup.status()).toBe(201);
  const body = await signup.json() as { verificationToken: string };
  await page.goto(`/verify-email?token=${encodeURIComponent(body.verificationToken)}`);
  await page.getByRole("button", { name: "Verify email and continue" }).click();
  await expect(page).toHaveURL(/\/onboarding/u);
  await expect(page.getByRole("heading", { name: "Set your game. Set your boundaries." })).toBeVisible();
  await page.getByRole("button", { name: "Save and enter FlightForge" }).click();
  await expect(page).toHaveURL(/\/profile/u, { timeout: 15_000 });
  await page.goto("/community");
  await page.getByLabel("I confirm that I am at least 18 years old.").check();
  await page.getByLabel(/I agree to the community guidelines/u).check();
  await page.getByRole("button", { name: "Enter the community" }).click();
  await expect(page.getByRole("heading", { name: /Welcome in, Browser Player/u })).toBeVisible();
  await expect(page.getByRole("heading", { name: "New England Clubhouse" })).toBeVisible();
  await page.getByRole("button", { name: "Join New England Clubhouse" }).click();
  await expect(page).toHaveURL(/\/messages\//u);
  const composer = page.getByRole("textbox", { name: "Message New England Clubhouse" });
  await composer.fill("Course conditions look good for the browser test.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("article").filter({ hasText: "You" }).getByText("Course conditions look good for the browser test.").last()).toBeVisible();
});

test("video dialog traps context and closes with Escape", async ({ page }) => {
  await page.goto("/play?eventId=flightforge-demo-event");
  const trigger = page.getByRole("button", { name: "Share video from hole 1" });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Share the shot everyone will remember." })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("phone discovery controls stay readable and the map drawer stays above app chrome", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/courses");

  const overview=page.getByRole("navigation",{name:"Browse courses by state"}).getByRole("link",{name:"All",exact:true});
  await expect(overview).toBeVisible();
  expect(await overview.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);

  await page.getByRole("button", { name: "Map view" }).click();
  const closeMap = page.getByRole("button", { name: "Close map" });
  await expect(closeMap).toBeVisible();
  const closeBounds = await closeMap.boundingBox();
  expect(closeBounds).not.toBeNull();
  expect(closeBounds!.y).toBeGreaterThanOrEqual(0);
  expect(closeBounds!.y + closeBounds!.height).toBeLessThanOrEqual(700);
  await closeMap.click();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("phone round HUD keeps the next action visible and upload dialogs use the light theme", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/play?eventId=flightforge-demo-event");

  const nextHole = page.getByRole("button", { name: "Next hole" });
  await expect(nextHole).toBeVisible();
  const nextBounds = await nextHole.boundingBox();
  expect(nextBounds).not.toBeNull();
  expect(nextBounds!.x + nextBounds!.width).toBeLessThanOrEqual(320);

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

  await page.getByRole("button", { name: "Share video from hole 1" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toHaveClass(/viewer/u);
});
test("restores the current hole and preserves caddie return context through sign in", async ({page}) => {
  await page.goto("/play?eventId=flightforge-demo-event");
  await page.getByRole("button",{name:"Ace",exact:true}).click();
  await page.getByRole("button",{name:"Go to hole 12, not scored",exact:true}).click();
  await page.reload();
  await expect(page.getByRole("heading",{name:"Score hole 12",exact:true})).toBeVisible();
  await expect(page.getByText(/Fictional demo/u)).toBeVisible();
  await page.getByRole("link",{name:"Ask the caddie",exact:true}).click();
  await expect(page).toHaveURL(/\/sign-in\?/u);
  const destination=new URL(page.url()).searchParams.get("return_to");
  expect(destination).toContain("round=flightforge-demo-event");
  expect(destination).toContain("hole=12");
  expect(destination).toContain("return_to=");
});

test("personal round completes, persists, corrects and recovers from a failed sync", async ({page,request},testInfo) => {
  const origin=new URL(String(testInfo.project.use.baseURL)).origin;
  const unique=Date.now()+"-"+testInfo.project.name;
  const signup=await request.post("/api/auth/signup",{headers:{origin,"cf-connecting-ip":"round-"+unique},data:{displayName:"Round Browser",email:"round-"+unique+"@example.test",password:"BrowserTrail2026!",acceptTerms:true}});
  expect(signup.status()).toBe(201);
  const {verificationToken}=await signup.json() as {verificationToken:string};
  await page.goto("/verify-email?token="+encodeURIComponent(verificationToken));
  await page.getByRole("button",{name:"Verify email and continue"}).click();
  await expect(page).toHaveURL(/onboarding/u);
  await page.getByRole("button",{name:"Save and enter FlightForge"}).click();
  await expect.poll(()=>new URL(page.url()).pathname).toBe("/profile");
  await page.goto("/courses?q=Bellamy");
  await page.locator(".course-card h3 a").first().click();
  await page.getByRole("link",{name:"Start round",exact:true}).click();
  await expect(page.getByRole("navigation",{name:"Mobile navigation",includeHidden:true}).locator('[aria-current="page"]')).toHaveCount(1);
  await page.getByLabel("Holes to play").fill("2");
  await page.getByRole("button",{name:"Start personal round",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Score hole 1",exact:true})).toBeVisible();
  let fail=true;
  await page.route("**/api/rounds/active",async route=>{
    if(route.request().method()==="PUT"&&fail){fail=false;await route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:{message:"Temporary test outage"}})});return;}
    await route.continue();
  });
  await page.getByRole("button",{name:"Ace",exact:true}).click();
  await expect(page.getByText("Temporary test outage",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Retry synchronization",exact:true}).click();
  await expect(page.getByText(/All scores saved/u)).toBeVisible();
  await page.getByRole("button",{name:"Next hole",exact:true}).click();
  await page.getByLabel("Strokes for hole 2").fill("8");
  await page.getByLabel("Strokes for hole 2").press("Enter");
  await page.getByRole("button",{name:"Add one penalty to hole 2",exact:true}).click();
  await expect(page.getByText(/All scores saved/u)).toBeVisible();
  await page.getByRole("button",{name:"Finish round",exact:true}).click();
  await page.getByRole("button",{name:"Finish and save",exact:true}).click();
  await expect(page).toHaveURL(/\/rounds\/[a-z0-9-]+$/u);
  await expect(page.getByText("10 strokes",{exact:true})).toBeVisible();
  await page.reload();
  await page.getByText("Correct a personal score",{exact:true}).click();
  await page.getByLabel("Hole",{exact:true}).fill("2");
  await page.getByLabel("Strokes",{exact:true}).fill("7");
  await page.getByLabel("Penalties",{exact:true}).fill("1");
  await page.getByLabel("Reason",{exact:true}).fill("Correcting a miscount after review.");
  await page.getByRole("button",{name:"Save correction",exact:true}).click();
  await expect(page.getByText("9 strokes",{exact:true})).toBeVisible();
  await page.getByRole("link",{name:"Round history",exact:true}).click();
  await expect(page.getByRole("link",{name:/Bellamy/u}).first()).toBeVisible();
});
