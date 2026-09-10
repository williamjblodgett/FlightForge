import {expect,test,type Page,type TestInfo} from "@playwright/test";
test.use({serviceWorkers:"allow"});
async function readyPlayer(page:Page,info:TestInfo) {
  const origin=new URL(String(info.project.use.baseURL)).origin,unique=crypto.randomUUID();
  const response=await page.request.post("/api/auth/signup",{headers:{origin,"cf-connecting-ip":"tools-"+unique},data:{displayName:"Tools Player",email:"tools-"+unique+"@example.test",password:"BrowserTrail2026!",acceptTerms:true}});
  expect(response.status()).toBe(201);
  const {verificationToken}=await response.json() as {verificationToken:string};
  await page.goto("/verify-email?token="+encodeURIComponent(verificationToken));
  await page.getByRole("button",{name:"Verify email and continue"}).click();
  await expect(page).toHaveURL(/onboarding/);
  await page.getByRole("button",{name:"Save and enter FlightForge"}).click();
  await expect(page).toHaveURL(/profile/);
  await expect(page.getByRole("heading",{name:"Tools Player",exact:true})).toBeVisible();
  await page.goto("/community");
  await page.getByLabel("I confirm that I am at least 18 years old.").check();
  await page.getByLabel(/I agree to the community guidelines/).check();
  await page.getByRole("button",{name:"Enter the community"}).click();
  await expect(page.getByRole("heading",{name:/Welcome in, Tools Player/})).toBeVisible();
}
async function courseLink(page:Page) {
  await page.goto("/courses");
  const link=page.locator('.course-card a[href^="/courses/"]').first();
  await expect(link).toBeVisible();
  return (await link.getAttribute("href"))!;
}
test("player creates an approved group, records a guest score and opens their private scorecard",async({page},info)=>{
  await readyPlayer(page,info);
  await page.goto("/groups");
  await page.getByText("Create a playing group",{exact:true}).click();
  await page.getByLabel("Meetup time (your device’s time zone)").fill(new Date(Date.now()+86400000).toISOString().slice(0,16));
  await page.getByRole("button",{name:"Create group",exact:true}).click();
  await expect(page).toHaveURL(/\/groups\/[a-z0-9-]+/);
  await expect(page.getByRole("heading",{name:"Group scoreboard"})).toBeVisible();
  await page.getByText("Host controls",{exact:true}).click();
  await page.getByLabel("Guest’s chosen nickname").fill("Guest Robin");
  await page.getByRole("button",{name:"Add guest",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Guest Robin (guest)"})).toBeVisible();
  await page.getByText("Record or correct guest score",{exact:true}).click();
  await page.getByLabel("Strokes",{exact:true}).fill("1");
  await page.getByRole("button",{name:"Save guest score",exact:true}).click();
  await expect(page.getByText("H1: 1",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Open my scorecard",exact:true}).click();
  await expect(page).toHaveURL(/\/play\?roundId=/);
  await expect(page.getByRole("heading",{name:"Score hole 1",exact:true})).toBeVisible();
});
test("course reports and private passport persist without overflowing mobile layouts",async({page},info)=>{
  await readyPlayer(page,info);
  const report="Paths are muddy today: "+crypto.randomUUID()+". Walk carefully.";
  const href=await courseLink(page);await page.goto(href);
  await page.getByRole("button",{name:"Follow in-app course updates",exact:true}).click();
  await page.getByText("Share a recent condition",{exact:true}).click();
  await page.getByLabel("What did you observe?",{exact:true}).fill(report);
  await page.getByRole("button",{name:"Post condition report",exact:true}).click();
  await expect(page.locator("article p").filter({hasText:report})).toBeVisible();
  await page.goto("/updates");
  await expect(page.getByText(report,{exact:true})).toBeVisible();
  await page.goto("/passport");
  await page.getByRole("button",{name:"Save passport entry",exact:true}).click();
  await expect(page.getByText("Passport saved privately.",{exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading",{name:"1 course listing played",exact:true})).toBeVisible();
  await page.getByLabel("Show my six-state challenge").check();
  await expect(page.locator(".passport-states>div")).toHaveCount(6);
  await page.screenshot({path:info.outputPath("passport.png"),fullPage:true});
  for(const path of ["/passport","/plan","/recover","/leagues","/downloads","/more"]){
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    const dimensions=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
  }
});
test("downloads a public course with a complete public-only offline cache",async({page,context})=>{
  const href=await courseLink(page);await page.goto(href);
  await page.getByRole("button",{name:"Save for offline use",exact:true}).click();
  await expect(page.getByText(/Available offline\. Saved/)).toBeVisible({timeout:20000});
  await page.goto("/offline");
  await page.getByLabel("Downloaded course").selectOption({index:1});
  await expect(page.locator("#guide h2").first()).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);

  const paths=await page.evaluate(async()=>{const keys=await caches.keys();const all=await Promise.all(keys.map(async key=>(await(await caches.open(key)).keys()).map(r=>new URL(r.url).pathname)));return all.flat();});
  expect(paths.length).toBeGreaterThanOrEqual(4);
  expect(paths.every(path=>["/offline","/offline.js","/offline.css","/brand/flightforge-mark.png"].includes(path))).toBe(true);
  await context.setOffline(false);
});
test("private offline scores reject stale tabs, synchronize and clear on sign-out",async({page,context},info)=>{
  await readyPlayer(page,info);
  const href=await courseLink(page);await page.goto(href);
  const startHref=await page.locator('a[href^="/rounds/new?"]').first().getAttribute("href");
  const courseId=new URL(startHref!,"https://example.test").searchParams.get("courseId");
  const origin=new URL(String(info.project.use.baseURL)).origin;
  const start=await page.request.post("/api/rounds/personal",{headers:{origin},data:{courseId,layoutId:null,holeCount:2,idempotencyKey:crypto.randomUUID()}});
  expect(start.status()).toBe(201);
  await page.getByLabel(/Also store my bag and latest active round/).check();
  await page.getByRole("button",{name:"Save for offline use",exact:true}).click();
  await expect(page.getByText(/Available offline\. Saved/)).toBeVisible({timeout:20000});
  await page.goto("/offline");await page.getByLabel("Downloaded course").selectOption({index:1});
  const second=await context.newPage();await second.goto("/offline");await second.getByLabel("Downloaded course").selectOption({index:1});
  await context.setOffline(true);
  await page.getByLabel("Strokes",{exact:true}).fill("1");
  await page.getByRole("button",{name:"Save offline score",exact:true}).click();
  await expect(page.locator("#status")).toContainText("saved on this device");
  await second.getByLabel("Strokes",{exact:true}).fill("2");
  await second.getByRole("button",{name:"Save offline score",exact:true}).click();
  await expect(second.locator("#status")).toContainText("changed in another tab");
  await context.setOffline(false);
  await page.getByRole("button",{name:"Sync pending scores",exact:true}).click();
  await expect(page.locator("#status")).toContainText("All scores synchronized");
  await second.goto("/more");
  await second.locator("button.signout-standalone").click();
  await expect(second).toHaveURL(new RegExp("/$"));
  await expect(page.locator("#status")).toContainText("Signed out");
});
test("downloaded public guide cold-reloads without a network",async({page,context,browserName})=>{
  // Reproduced driver navigation failure even with an activated controller and cached shell.
  // Owner: offline module. Next: verify on physical iOS before enabling this cold-start claim.
  test.fixme(browserName==="webkit","WebKit automation on Windows and Linux cannot reload after setOffline; physical iOS cold-start validation is still required.");
  const href=await courseLink(page);await page.goto(href);
  await page.getByRole("button",{name:"Save for offline use",exact:true}).click();
  await expect(page.getByText(/Available offline\. Saved/)).toBeVisible({timeout:20000});
  await page.goto("/offline");await page.getByLabel("Downloaded course").selectOption({index:1});
  await expect(page.locator("#guide h2").first()).toBeVisible();
  await context.setOffline(true);await page.reload();
  await page.getByLabel("Downloaded course").selectOption({index:1});
  await expect(page.locator("#guide h2").first()).toBeVisible();
  await context.setOffline(false);
});
