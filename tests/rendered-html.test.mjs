import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { preview } from "vite";

let previewServer;
let baseUrl;

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
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("server-renders a canonical course detail with its unclaimed notice", async () => {
  const response = await render("/courses/sabattus-disc-golf-eagle");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Sabattus Disc Golf/);
  assert.match(html, /This listing has not yet been claimed or verified by the course operator/);
  assert.match(html, /application\/ld\+json/);
});

test("keeps administrator claims protected", async () => {
  const response = await render("/admin/claims");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Platform administrator access required/);
  assert.match(html, /noindex|index:false/i);
});

test("creates a free player account and persists first-run privacy settings", async () => {
  const email = `player-${Date.now()}@example.test`;
  const signup = await fetch(`${baseUrl}/api/auth/signup`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ displayName: "Trail Tester", email, password: "TrailBasket2026!", acceptTerms: true }),
  });
  assert.equal(signup.status, 201);
  const cookie = signup.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, "signup must issue a secure session cookie");
  const signupBody = await signup.json();
  assert.equal(signupBody.next, "/onboarding");

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
});

test("seeds the player-only JPhillips tester on first successful login", async () => {
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email: "jphillips@demo.flightforge.app", password: "password1234" }),
  });
  assert.equal(login.status, 200);
  const body = await login.json();
  assert.deepEqual(body.user.roles, ["PLAYER"]);
  assert.equal(body.user.onboardingComplete, false);
  assert.equal(body.user.mustChangePassword, true);
  assert.equal(body.next, "/account/password");
});
