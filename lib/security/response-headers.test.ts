import { describe, expect, it } from "vitest";
import { withSecurityHeaders } from "./response-headers";

describe("withSecurityHeaders", () => {
  it("adds browser security policy and HSTS on HTTPS", async () => {
    const secured = withSecurityHeaders(
      new Request("https://flightforge.example/courses"),
      new Response("ok", { headers: { "content-type": "text/plain" } }),
    );
    expect(secured.headers.get("content-security-policy")).toContain("object-src 'none'");
    expect(secured.headers.get("content-security-policy")).toContain("frame-ancestors");
    expect(secured.headers.get("content-security-policy")).toContain("frame-src 'self' https://www.google.com");
    expect(secured.headers.get("permissions-policy")).toContain("microphone=(self)");
    expect(secured.headers.get("strict-transport-security")).toBe("max-age=31536000");
    expect(secured.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await secured.text()).toBe("ok");
  });

  it("prevents caching authenticated and private responses", () => {
    const privateResponse = withSecurityHeaders(
      new Request("https://flightforge.example/profile", {
        headers: { cookie: "flightforge_session=secret" },
      }),
      new Response("profile"),
    );
    expect(privateResponse.headers.get("cache-control")).toBe("private, no-store");
    expect(privateResponse.headers.get("vary")).toContain("Cookie");
    expect(privateResponse.headers.get("vary")).toContain("oai-authenticated-user-email");
  });
});
