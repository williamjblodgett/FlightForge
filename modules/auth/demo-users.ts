import type { Role } from "./types";

export type DemoUser = {
  id: string;
  email: string;
  password: string;
  displayName: string;
  label: string;
  roles: Role[];
};

export const demoUsers: DemoUser[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    email: "beginner@demo.flightforge.app",
    password: "ForgeDemo2026!",
    displayName: "Maya Beginner",
    label: "Beginner player",
    roles: ["PLAYER"],
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    email: "recreational@demo.flightforge.app",
    password: "ForgeDemo2026!",
    displayName: "Cal Rivers",
    label: "Recreational player",
    roles: ["PLAYER"],
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    email: "advanced@demo.flightforge.app",
    password: "ForgeDemo2026!",
    displayName: "Jordan Pike",
    label: "Advanced player",
    roles: ["PLAYER"],
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    email: "owner@demo.flightforge.app",
    password: "ForgeDemo2026!",
    displayName: "Morgan Pine",
    label: "Course owner",
    roles: ["PLAYER", "COURSE_OWNER"],
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    email: "staff@demo.flightforge.app",
    password: "ForgeDemo2026!",
    displayName: "Riley Moss",
    label: "Course staff",
    roles: ["PLAYER", "COURSE_STAFF"],
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    email: "director@demo.flightforge.app",
    password: "ForgeDemo2026!",
    displayName: "Taylor Card",
    label: "Tournament director",
    roles: ["PLAYER", "TOURNAMENT_DIRECTOR"],
  },
  {
    id: "10000000-0000-4000-8000-000000000007",
    email: "league@demo.flightforge.app",
    password: "ForgeDemo2026!",
    displayName: "Avery Chains",
    label: "League administrator",
    roles: ["PLAYER", "LEAGUE_ADMIN"],
  },
  {
    id: "10000000-0000-4000-8000-000000000008",
    email: "admin@demo.flightforge.app",
    password: "ForgeDemo2026!",
    displayName: "Sam Forge",
    label: "Platform administrator",
    roles: ["PLAYER", "PLATFORM_ADMIN"],
  },
];

export function findDemoUser(email: string): DemoUser | undefined {
  const normalized = email.trim().toLowerCase();
  return demoUsers.find((user) => user.email === normalized);
}
