import { expect, type Page, type TestInfo } from "@playwright/test";
import { test } from "./fixtures";

async function player(page: Page, info: TestInfo) {
  const unique = crypto.randomUUID();
  const signup = await page.request.post("/api/auth/signup", {
    headers: { origin: new URL(String(info.project.use.baseURL)).origin, "cf-connecting-ip": "review-" + unique },
    data: { displayName: "Review Player", email: `review-${unique}@example.test`, password: "ReviewTrail2026!", acceptTerms: true },
  });
  expect(signup.status()).toBe(201);
  const { verificationToken } = await signup.json() as { verificationToken: string };
  await page.goto("/verify-email?token=" + encodeURIComponent(verificationToken));
  await page.getByRole("button", { name: "Verify email and continue" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByRole("button", { name: "Save and enter FlightForge" }).click();
  await expect(page).toHaveURL(/\/profile/);
  await expect(page.getByRole("heading",{name:"Review Player",exact:true})).toBeVisible();
}

test("guest messages redirect preserves the destination without a render crash", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/messages");
  await expect(page).toHaveURL(/\/sign-in\?return_to=%2Fmessages/);
  await expect(page.locator("main h1")).toBeVisible();
  expect(errors).toEqual([]);
});

test("starting without a course offers a useful next step instead of a missing page",async({page})=>{
  const response=await page.goto("/rounds/new");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading",{name:"Choose your course first",exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"Find a course",exact:true})).toHaveAttribute("href","/courses");
});

test("private player tools explain account access without exposing unusable forms",async({page})=>{
  for(const path of ["/groups","/passport","/leagues"]){
    await page.goto(path);
    await expect(page.locator(".account-gate")).toBeVisible();
    await expect(page.locator(".account-gate").getByRole("link",{name:"Sign in",exact:true})).toHaveAttribute("href","/sign-in?return_to="+encodeURIComponent(path));
    await expect(page.locator("main form")).toHaveCount(0);
    await expect(page.getByText(/No groups available|No stamps yet|No league schedules/)).toHaveCount(0);
  }
});

test("tool failures offer read-only retries, not false empty states",async({page},info)=>{
  await player(page,info);
  for(const [path,label,key,empty] of [
    ["/passport","passport","stamps","No stamps yet."],
    ["/groups","groups","groups","No groups available yet."],
    ["/leagues","leagues","leagues","No league schedules have been published yet."]
  ]){
    await page.route("**/api"+path,route=>route.fulfill({status:503,json:{error:{message:"Temporary test outage"}}}));
    await page.goto(path);
    await expect(page.getByRole("alert")).toContainText("Temporary test outage");
    await expect(page.getByText(empty,{exact:false})).toHaveCount(0);
    await page.unroute("**/api"+path);
    await page.route("**/api"+path,route=>route.fulfill({json:{[key]:[]}}));
    await page.getByRole("button",{name:"Retry loading "+label,exact:true}).click();
    await expect(page.getByText(empty,{exact:false})).toBeVisible();
    await page.unroute("**/api"+path);
  }
});

test("passport acknowledges a saved entry when refresh fails and retries only the read",async({page},info)=>{
  await player(page,info);
  await page.goto("/passport");
  const save=page.getByRole("button",{name:"Save passport entry",exact:true});
  await expect(save).toBeEnabled();
  let writes=0;
  await page.route("**/api/passport",async route=>{
    if(route.request().method()==="PUT"){writes++;await route.continue();}
    else await route.fulfill({status:503,json:{error:{message:"Refresh temporarily unavailable"}}});
  });
  await save.click();
  await expect(page.getByText(/Your passport entry was saved/)).toBeVisible();
  await expect(save).toBeDisabled();
  await page.unroute("**/api/passport");
  await page.getByRole("button",{name:"Retry loading passport",exact:true}).click();
  await expect(page.getByRole("heading",{name:"1 course listing played",exact:true})).toBeVisible();
  expect(writes).toBe(1);
});

test("discovery keeps the filter panel and focus while composing filters", async ({ page }) => {
  await page.goto("/courses");
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByRole("combobox", { name: "Difficulty", exact: true }).selectOption("UNRATED");
  await expect(page).toHaveURL(/difficulty=UNRATED/);
  await expect(page.getByRole("button", { name: "Filters", exact: true })).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("combobox", { name: "Price", exact: true }).selectOption("FREE");
  await expect(page).toHaveURL(/price=FREE/);
  await expect(page.getByRole("combobox", { name: "Difficulty", exact: true })).toHaveValue("UNRATED");
  await page.getByRole("button", { name: "Clear filters", exact: true }).first().click();
  await expect(page.getByRole("combobox", { name: "Price", exact: true })).toHaveValue("ALL");
  await expect(page.getByRole("button", { name: "Filters", exact: true })).toHaveAttribute("aria-expanded", "true");
});

test("new player tools retain exactly one mobile navigation selection", async ({ page }, info) => {
  await player(page, info);
  for (const path of ["/groups", "/updates", "/practice", "/recover", "/leagues", "/passport", "/plan", "/downloads"]) {
    await page.goto(path);
    await expect(page.locator('.mobile-nav [aria-current="page"]')).toHaveCount(1);
    await expect(page.locator('.mobile-nav [aria-current="page"]')).toHaveAttribute("href", "/more");
  }
});

test("map bounds follow clear-area and browser history without closing filters", async ({ page }) => {
  await page.setViewportSize({width:1440,height:1000});
  await page.goto("/courses?view=split&bbox=-71.5,44.1,-71.2,44.4");
  const originalHeading=await page.locator("#results-heading").innerText();
  await page.getByRole("button", {name:"Filters",exact:true}).click();
  await page.getByRole("button", {name:"Clear map area",exact:true}).click();
  await expect.poll(()=>new URL(page.url()).searchParams.has("bbox")).toBe(false);
  await expect(page.locator("#results-heading")).not.toContainText("in this area");
  await page.getByRole("button", {name:"Search this area",exact:true}).click();
  await expect.poll(()=>{const bounds=new URL(page.url()).searchParams.get("bbox")?.split(",").map(Number);return bounds?bounds[2]-bounds[0]:0;}).toBeGreaterThan(6);
  await page.goBack();
  await expect(page.locator("#results-heading")).not.toContainText("in this area");
  await page.goBack();
  await expect(page).toHaveURL(/bbox=-71\.5/);
  await expect(page.locator("#results-heading")).toHaveText(originalHeading);
  await expect(page.locator(".explorer-layout")).toHaveAttribute("aria-busy","false");
  await expect.poll(async()=>{const bounds=JSON.parse((await page.locator(".course-map").getAttribute("data-map-bounds"))!);return bounds.east-bounds.west;}).toBeLessThan(1);
  await expect(page.getByRole("button", {name:"Filters",exact:true})).toHaveAttribute("aria-expanded","true");
  await page.getByRole("button", {name:"Search this area",exact:true}).click();
  await expect.poll(()=>{const bounds=new URL(page.url()).searchParams.get("bbox")?.split(",").map(Number);return bounds?bounds[2]-bounds[0]:10;}).toBeLessThan(1);
});

test("saved discs survive refresh failures and removal errors stay in the dialog", async ({ page }, info) => {
  await player(page, info);
  await page.goto("/bag");
  await page.getByRole("button", { name: "Add a disc", exact: true }).click();
  await page.getByLabel("Manufacturer", { exact: true }).fill("Test manufacturer");
  await page.getByLabel("Mold", { exact: true }).fill("Review putter");
  await page.route("**/api/bag", async route => {
    if (route.request().method() === "GET") await route.fulfill({ status: 503, json: { error: { message: "Test read unavailable" } } });
    else await route.continue();
  });
  await page.getByRole("button", { name: "Add to collection", exact: true }).click();
  await expect(page.getByText(/Your disc was saved/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to collection", exact: true })).toHaveCount(0);
  await expect(page.locator(".owned-disc-list article")).toHaveCount(1);
  await page.unroute("**/api/bag");
  await page.reload();
  await expect(page.locator(".owned-disc-list article")).toHaveCount(1);
  await page.route("**/api/bag/*", async route => {
    if (route.request().method() === "DELETE") await route.fulfill({ status: 503, json: { error: { message: "Temporary removal error" } } });
    else await route.continue();
  });
  await page.getByRole("button", { name: "Remove Review putter", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Remove disc", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Temporary removal error");
  await page.unroute("**/api/bag/*");
  await dialog.getByRole("button", { name: "Remove disc", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".owned-disc-list article")).toHaveCount(0);

  await page.setViewportSize({ width: 320, height: 700 });
  await page.getByLabel("Open profile menu for Review Player").click();
  const signOut = page.locator(".profile-popover").getByRole("button", { name: /Sign out/ });
  await signOut.scrollIntoViewIfNeeded();
  const menu = await page.locator(".profile-popover").boundingBox();
  const bounds = await signOut.boundingBox();
  expect(menu!.y + menu!.height).toBeLessThan(620);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(menu!.y + menu!.height);
  await page.screenshot({ path: info.outputPath("mobile-profile-menu.png") });
});
