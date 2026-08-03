import { describe, expect, it } from "vitest";
import { isSameOriginMutation, requestClientKey } from "./request-origin";

describe("request mutation security", () => {
  it("accepts exact same-origin requests", () => {
    const request = new Request("https://flightforge.example/api/claims", {
      method: "POST",
      headers: { origin: "https://flightforge.example" },
    });
    expect(isSameOriginMutation(request)).toBe(true);
  });

  it("rejects missing or cross-origin mutation origins", () => {
    expect(isSameOriginMutation(new Request("https://flightforge.example/api/claims"))).toBe(false);
    expect(
      isSameOriginMutation(
        new Request("https://flightforge.example/api/claims", {
          headers: { origin: "https://attacker.example" },
        }),
      ),
    ).toBe(false);
  });

  it("prefers the trusted edge client address", () => {
    const request = new Request("https://flightforge.example", {
      headers: { "cf-connecting-ip": "203.0.113.4", "x-forwarded-for": "198.51.100.2" },
    });
    expect(requestClientKey(request)).toBe("203.0.113.4");
  });
});
