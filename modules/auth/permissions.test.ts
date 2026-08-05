import { describe, expect, it } from "vitest";
import { can } from "./permissions";
import type { AuthenticatedUser } from "./types";

function user(roles: AuthenticatedUser["roles"]): AuthenticatedUser {
  return {
    id: "user-1",
    email: "test@example.com",
    displayName: "Test User",
    roles,
    source: "demo",
    onboardingComplete: true,
    isTestAccount: true,
    mustChangePassword: false,
  };
}

describe("role permissions", () => {
  it("allows players to save courses and submit an initial ownership claim", () => {
    expect(can(user(["PLAYER"]), "favoriteCourse")).toBe(true);
    expect(can(user(["PLAYER"]), "submitCourseClaim")).toBe(true);
  });

  it("keeps claim review restricted to platform administrators", () => {
    expect(can(user(["COURSE_OWNER"]), "reviewCourseClaim")).toBe(false);
    expect(can(user(["PLATFORM_ADMIN"]), "reviewCourseClaim")).toBe(true);
    expect(can(null, "reviewCourseClaim")).toBe(false);
  });

  it("allows verified event coordinators to publish without granting admin access", () => {
    expect(can(user(["TOURNAMENT_DIRECTOR"]), "manageEvents")).toBe(true);
    expect(can(user(["LEAGUE_ADMIN"]), "publishEvents")).toBe(true);
    expect(can(user(["TOURNAMENT_DIRECTOR"]), "viewAdmin")).toBe(false);
    expect(can(user(["PLAYER"]), "publishEvents")).toBe(false);
  });

  it("allows every signed-in operating role to manage only its own disc bag", () => {
    expect(can(user(["PLAYER"]), "manageOwnBag")).toBe(true);
    expect(can(user(["INSTRUCTOR"]), "requestCaddieRecommendation")).toBe(true);
    expect(can(null, "manageOwnBag")).toBe(false);
  });
});
