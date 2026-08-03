export const roleValues = [
  "PLAYER",
  "COURSE_STAFF",
  "COURSE_OWNER",
  "TOURNAMENT_DIRECTOR",
  "LEAGUE_ADMIN",
  "INSTRUCTOR",
  "PLATFORM_ADMIN",
] as const;

export type Role = (typeof roleValues)[number];

export type AuthenticatedUser = {
  id: string;
  email: string;
  displayName: string;
  roles: Role[];
  source: "chatgpt" | "demo" | "password";
  onboardingComplete: boolean;
  isTestAccount: boolean;
  mustChangePassword: boolean;
};
