import type { Role } from "./types";

/** Roles granted only after an upstream provider has verified the exact email. */
export function rolesForConfiguredEmail(email: string): Role[] {
  const normalized = email.trim().toLowerCase();
  const roles: Role[] = ["PLAYER"];
  if (emailList("COURSE_OWNER_EMAILS").has(normalized)) roles.push("COURSE_OWNER");
  if (emailList("EVENT_COORDINATOR_EMAILS").has(normalized)) roles.push("TOURNAMENT_DIRECTOR");
  if (emailList("LEAGUE_ADMIN_EMAILS").has(normalized)) roles.push("LEAGUE_ADMIN");
  if (emailList("PLATFORM_ADMIN_EMAILS").has(normalized)) roles.push("PLATFORM_ADMIN");
  return roles;
}

function emailList(variableName: string): Set<string> {
  return new Set((process.env[variableName] ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean));
}
