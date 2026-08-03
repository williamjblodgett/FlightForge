import type { AuthenticatedUser, Role } from "./types";

export const permissions = {
  favoriteCourse: ["PLAYER", "PLATFORM_ADMIN"],
  submitCourseClaim: ["PLAYER", "COURSE_OWNER", "PLATFORM_ADMIN"],
  reviewCourseClaim: ["PLATFORM_ADMIN"],
  viewAdmin: ["PLATFORM_ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof permissions;

export function hasRole(
  user: AuthenticatedUser | null,
  allowedRoles: readonly Role[],
): boolean {
  return Boolean(user?.roles.some((role) => allowedRoles.includes(role)));
}

export function can(
  user: AuthenticatedUser | null,
  permission: Permission,
): boolean {
  return hasRole(user, permissions[permission]);
}
