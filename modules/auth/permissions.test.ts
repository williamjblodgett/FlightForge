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
});
