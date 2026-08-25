import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { preview } from "vite";

let previewServer;
let baseUrl;

const coordinatorRunId = `${process.pid}-${Date.now()}`;
const coordinatorEmail = process.env.TEST_COORDINATOR_EMAIL;

before(async () => {
  previewServer = await preview({
    preview: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false,
    },
  });

  const address = previewServer.httpServer.address();
  assert.ok(address && typeof address === "object", "preview server must bind a TCP port");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await previewServer?.close();
});

async function render(pathname) {
  return fetch(`${baseUrl}${pathname}`, { headers: { accept: "text/html" } });
}

test("server-renders FlightForge discovery without starter metadata", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /FlightForge/);
  assert.match(html, /Find your line/);
  assert.match(html, /Sabattus Disc Golf/);
  assert.match(html, /Maine is the first tee|Maine/);
  assert.match(html, /flightforge-maine-hero-v2\.webp/u);
  assert.match(html, /Illustrative field scene/u);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("serves browser security headers", async () => {
  const response = await render("/");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.match(response.headers.get("content-security-policy") ?? "", /object-src 'none'/u);
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors/u);
});

test("reports production dependency health without exposing secrets", async () => {
  const response = await fetch(`${baseUrl}/api/health`, { headers: { accept: "application/json" } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const health = await response.json();
  assert.equal(health.status, "ok");
  assert.equal(health.service, "flightforge-web");
  assert.deepEqual(health.checks, { database: true, privateStorage: true });
  assert.equal(typeof health.supabaseConfigured, "boolean");
  assert.equal("serviceRoleKey" in health, false);
});

test("server-renders a canonical course detail with its unclaimed notice", async () => {
  const response = await render("/courses/sabattus-disc-golf-eagle");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Sabattus Disc Golf/);
  assert.match(html, /This course has not joined FlightForge yet/);
  assert.match(html, /application\/ld\+json/);
});

test("keeps administrator claims protected", async () => {
  const response = await render("/admin/claims");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Platform administrator access required/);
  assert.match(html, /noindex|index:false/i);
});

test("does not authenticate a visitor from external identity headers", async () => {
  const response = await fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin: baseUrl,
      "oai-authenticated-user-email": "forged-admin@example.test",
      "oai-authenticated-user-id": "forged-external-subject",
      "idempotency-key": "forged-external-identity-attempt",
    },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "AUTHENTICATION_REQUIRED");
});

test("renders the highlight-enabled scorecard and protects video uploads", async () => {
  const scorecard = await render("/play?eventId=flightforge-demo-event");
  assert.equal(scorecard.status, 200, await scorecard.clone().text());
  const html = await scorecard.text();
  assert.match(html, /Scorecard &amp; moments/u);
  assert.match(html, /Share video from hole 1/u);

  const form = new FormData();
  form.set("courseId", "flightforge-demo-course");
  form.set("eventId", "flightforge-demo-event");
  form.set("holeNumber", "1");
  const upload = await fetch(`${baseUrl}/api/hole-highlights`, { method: "POST", headers: { origin: baseUrl }, body: form });
  assert.equal(upload.status, 401);
});

test("makes Fieldwork discoverable without expanding the five-item mobile navigation", async () => {
  const play = await render("/play");
  assert.equal(play.status, 200, await play.clone().text());
  const playHtml = await play.text();
  assert.match(playHtml, /href="\/fieldwork"/u);
  assert.match(playHtml, />Fieldwork</u);

  const home = await render("/");
  assert.equal(home.status, 200);
  assert.match(await home.text(), /href="\/fieldwork"[^>]*>Fieldwork</u);

  const fieldwork = await render("/fieldwork");
  assert.equal(fieldwork.status, 200, await fieldwork.clone().text());
  const fieldworkHtml = await fieldwork.text();
  assert.match(fieldworkHtml, /Find space/u);
  assert.match(fieldworkHtml, /course listing is not permission/iu);
});

test("creates a free player account and persists first-run privacy settings", async () => {
  const email = `player-${Date.now()}@example.test`;
  const signup = await fetch(`${baseUrl}/api/auth/signup`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", origin: baseUrl, "cf-connecting-ip": `player-${coordinatorRunId}` },
    body: JSON.stringify({ displayName: "Trail Tester", email, password: "TrailBasket2026!", acceptTerms: true }),
  });
  assert.equal(signup.status, 201, await signup.clone().text());
  const signupBody = await signup.json();
  assert.equal(signupBody.next, "/verify-email");
  assert.ok(signupBody.verificationToken, "test delivery must expose a verification token");
  const verification = await fetch(`${baseUrl}/api/auth/verify-email`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ token: signupBody.verificationToken }),
  });
  assert.equal(verification.status, 200);
  const cookie = verification.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, "verification must issue a secure session cookie");
  assert.equal((await verification.json()).next, "/onboarding");

  const settings = await fetch(`${baseUrl}/api/account/onboarding`, {
    method: "PUT",
    headers: { accept: "application/json", "content-type": "application/json", origin: baseUrl, cookie },
    body: JSON.stringify({
      displayName: "Trail Tester", homeCity: "Portland", homeRegionCode: "ME", postalCode: "04101",
      experienceLevel: "RECREATIONAL", throwingHand: "RIGHT", controlledDistanceFeet: 275,
      playStyle: "CASUAL", socialMatchmaking: false, aiRecommendations: true,
      tournamentNotifications: false, profileVisibility: "PRIVATE", showHomeCity: false,
      showRoundHistory: false, showBag: false, allowMessages: "CONNECTIONS",
      allowGameInvites: true, analyticsOptIn: false, aiTrainingOptIn: false,
    }),
  });
  assert.equal(settings.status, 200);
  const profile = await fetch(`${baseUrl}/profile`, { headers: { accept: "text/html", cookie } });
  assert.equal(profile.status, 200);
  assert.match(await profile.text(), /Player profile & privacy|Player profile and privacy/i);

  const catalogResponse = await fetch(`${baseUrl}/api/discs/catalog?q=teebird`, { headers: { accept: "application/json" } });
  assert.equal(catalogResponse.status, 200);
  const catalog = await catalogResponse.json();
  assert.equal(catalog.discs.length, 1);
  assert.match(catalog.discs[0].ratingSourceUrl, /^https:\/\//u);

  const addDisc = await fetch(`${baseUrl}/api/bag`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", origin: baseUrl, cookie },
    body: JSON.stringify({
      catalogMoldId: catalog.discs[0].id, manufacturerName: "", moldName: "",
      manualSpeed: null, manualGlide: null, manualTurn: null, manualFade: null,
      plastic: "Star", weightGrams: 173, color: "Orange", nickname: "Trail line",
      condition: "SEASONED", wearRating: 4, domeProfile: "NEUTRAL", runName: null,
      status: "IN_BAG", notes: "Integration-test physical disc",
    }),
  });
  assert.equal(addDisc.status, 201);
  const addedDisc = (await addDisc.json()).disc;
  assert.equal(addedDisc.moldName, "TeeBird");
  assert.match(addedDisc.ratingSource, /Innova/u);

  const caddieResponse = await fetch(`${baseUrl}/api/caddie/recommendations`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", origin: baseUrl, cookie },
    body: JSON.stringify({
      distanceFeet: 300, windMph: 8, windDirection: "HEADWIND", fairwayShape: "LEFT",
      throwingHand: "RIGHT", throwType: "BACKHAND", controlledDistanceFeet: 275,
      riskPreference: "BALANCED", elevationChangeFeet: 0, groundCondition: "NORMAL", hazardLevel: "LOW",
    }),
  });
  assert.equal(caddieResponse.status, 201);
  const caddie = await caddieResponse.json();
  assert.equal(caddie.recommendation.primaryDiscId, addedDisc.id);
  assert.match(caddie.recommendation.confidenceBasis, /catalog baseline/i);

  const chatResponse = await fetch(`${baseUrl}/api/caddie/chat`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", origin: baseUrl, cookie },
    body: JSON.stringify({ message: "What changes in an 8 mph headwind?", conversationId: null }),
  });
  assert.equal(chatResponse.status, 201);
  const chat = await chatResponse.json();
  assert.equal(chat.mode, "FIELD_GUIDE");
  assert.match(chat.messages[1].content, /relative airspeed/i);
  const chatHistory = await fetch(`${baseUrl}/api/caddie/chat?conversationId=${chat.conversationId}`, { headers: { accept: "application/json", cookie } });
  assert.equal(chatHistory.status, 200);
  assert.equal((await chatHistory.json()).messages.length, 2);

  const feedback = await fetch(`${baseUrl}/api/caddie/recommendations/${caddie.id}/feedback`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", origin: baseUrl, cookie },
    body: JSON.stringify({
      playerDiscId: addedDisc.id, throwType: "BACKHAND", intendedShape: "LEFT",
      result: "SUCCESS", flightAdjustment: "AS_EXPECTED", missDirection: "NONE",
      distanceFeet: 294, windMph: 8, windDirection: "HEADWIND", representative: true, comment: null,
    }),
  });
  assert.equal(feedback.status, 201);

  const refreshedBag = await fetch(`${baseUrl}/api/bag`, { headers: { accept: "application/json", cookie } });
  assert.equal(refreshedBag.status, 200);
  const refreshedDisc = (await refreshedBag.json()).discs[0];
  assert.equal(refreshedDisc.profiles[0].sampleCount, 1);

  const removeDisc = await fetch(`${baseUrl}/api/bag/${addedDisc.id}`, {
    method: "DELETE",
    headers: { accept: "application/json", "content-type": "application/json", origin: baseUrl, cookie },
    body: JSON.stringify({ version: refreshedDisc.version }),
  });
  assert.equal(removeDisc.status, 204);

  const passwordChange = await fetch(`${baseUrl}/api/account/password`, {
    method: "PUT",
    headers: { accept: "application/json", "content-type": "application/json", origin: baseUrl, cookie },
    body: JSON.stringify({
      currentPassword: "TrailBasket2026!",
      newPassword: "PrivateTrail2026!",
      confirmation: "PrivateTrail2026!",
    }),
  });
  assert.equal(passwordChange.status, 200);
  assert.ok(passwordChange.headers.get("set-cookie"), "password change must rotate the session cookie");
  const oldLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email, password: "TrailBasket2026!" }),
  });
  assert.equal(oldLogin.status, 401);
  const newLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email, password: "PrivateTrail2026!" }),
  });
  assert.equal(newLogin.status, 200);
  const activeCookie = newLogin.headers.get("set-cookie")?.split(";")[0];
  assert.ok(activeCookie, "sign-in must issue a session cookie");

  const signedInProfile = await fetch(`${baseUrl}/profile`, {
    headers: { accept: "text/html", cookie: activeCookie },
  });
  const signedInHtml = await signedInProfile.text();
  assert.match(signedInHtml, /signout-header/u, "desktop header must expose sign out directly");
  assert.match(signedInHtml, /Finished for now\?/u, "profile must expose a mobile-friendly sign-out section");

  const logout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "DELETE",
    headers: { accept: "application/json", origin: baseUrl, cookie: activeCookie },
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie") ?? "", /Max-Age=0/i);

  const revokedProfile = await fetch(`${baseUrl}/profile`, {
    redirect: "manual",
    headers: { accept: "text/html", cookie: activeCookie },
  });
  assert.equal(revokedProfile.status, 307);
  const redirectLocation = revokedProfile.headers.get("location");
  assert.ok(redirectLocation);
  assert.equal(new URL(redirectLocation, baseUrl).pathname, "/sign-in");
});

test("seeds the player-only JPhillips tester on first successful login", async () => {
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email: "jphillips@demo.flightforge.app", password: "password1234" }),
  });
  assert.equal(login.status, 200, await login.clone().text());
  const body = await login.json();
  assert.deepEqual(body.user.roles, ["PLAYER"]);
  assert.equal(body.user.onboardingComplete, false);
  assert.equal(body.user.mustChangePassword, true);
  assert.equal(body.next, "/account/password");
});

test("lets an authorized coordinator publish an idempotent event to the public board", async () => {
  assert.ok(coordinatorEmail, "the server-test runner must configure a unique coordinator email");
  const signup = await fetch(`${baseUrl}/api/auth/signup`, {
    method: "POST",
    headers: {
      accept: "application/json", "content-type": "application/json", origin: baseUrl,
      "cf-connecting-ip": `coordinator-${coordinatorRunId}`,
    },
    body: JSON.stringify({
      displayName: "Event Coordinator",
      email: coordinatorEmail,
      password: "CoordinatorTrail2026!",
      acceptTerms: true,
    }),
  });
  assert.equal(signup.status, 201, await signup.clone().text());
  const signupBody = await signup.json();
  assert.ok(signupBody.verificationToken, "coordinator email must be verified before roles are granted");
  const verification = await fetch(`${baseUrl}/api/auth/verify-email`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ token: signupBody.verificationToken }),
  });
  assert.equal(verification.status, 200, await verification.clone().text());
  const coordinatorCookie = verification.headers.get("set-cookie")?.split(";")[0];
  assert.ok(coordinatorCookie, "verified coordinator must receive a FlightForge session");
  const verifiedCoordinator = await verification.json();
  assert.ok(verifiedCoordinator.user.roles.includes("TOURNAMENT_DIRECTOR"));
  assert.ok(verifiedCoordinator.user.roles.includes("PLATFORM_ADMIN"));
  const coordinatorHeaders = {
    accept: "application/json", "content-type": "application/json", origin: baseUrl, cookie: coordinatorCookie,
  };
  const idempotencyKey = `event-test-${coordinatorRunId}`;
  const eventInput = {
    organizationName: "Maine Fairway Club", eventType: "TOURNAMENT", title: `Pine Tree Integration Open ${coordinatorRunId}`,
    summary: "A clearly listed one-day disc golf event for integration testing.",
    description: "This organizer-owned event verifies the complete draft and public publishing path without external registration or payment claims.",
    courseId: null, layoutId: null, holeCount: 18, venueName: "Community Disc Golf Course", addressLine1: null,
    city: "Augusta", regionCode: "ME", countryCode: "US",
    timeZone: "America/New_York",
    startsAt: "2100-06-15T13:00:00.000Z", endsAt: "2100-06-15T21:00:00.000Z",
    registrationOpensAt: null, registrationClosesAt: null, registrationUrl: null,
    contactEmail: coordinatorEmail, capacity: 90, entryFeeCents: 0,
    currency: "USD", format: "Two rounds of stroke play", divisions: ["Recreational", "Advanced"],
    accessibilityNotes: "Contact the organizer for accommodation coordination.", visibility: "PUBLIC", action: "PUBLISH",
  };
  const publish = () => fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: {
      accept: "application/json", "content-type": "application/json", origin: baseUrl,
      ...coordinatorHeaders, "idempotency-key": idempotencyKey,
    },
    body: JSON.stringify(eventInput),
  });
  const first = await publish();
  assert.equal(first.status, 201, await first.clone().text());
  const firstEvent = (await first.json()).event;
  const duplicate = await publish();
  assert.equal(duplicate.status, 201);
  assert.equal((await duplicate.json()).event.id, firstEvent.id);

  const unpublish = await fetch(`${baseUrl}/api/events/${firstEvent.id}`, {
    method: "PATCH",
    headers: coordinatorHeaders,
    body: JSON.stringify({ action: "UNPUBLISH", reason: "Verifying the private draft transition", version: firstEvent.version }),
  });
  assert.equal(unpublish.status, 200);
  const draftEvent = (await unpublish.json()).event;
  assert.equal(draftEvent.status, "DRAFT");
  assert.equal((await render(`/events/${firstEvent.slug}`)).status, 404);

  const republish = await fetch(`${baseUrl}/api/events/${firstEvent.id}`, {
    method: "PATCH",
    headers: coordinatorHeaders,
    body: JSON.stringify({ action: "PUBLISH", reason: "Event details passed coordinator review", version: draftEvent.version }),
  });
  assert.equal(republish.status, 200);

  const publicPage = await render(`/events/${firstEvent.slug}`);
  assert.equal(publicPage.status, 200);
  const html = await publicPage.text();
  assert.ok(html.includes(eventInput.title));
  assert.match(html, /Organizer posted/u);

  const board = await render("/events");
  assert.equal(board.status, 200);
  assert.ok((await board.text()).includes(eventInput.title));
});
