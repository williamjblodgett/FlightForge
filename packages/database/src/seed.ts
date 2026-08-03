import { demoUsers } from "../../../modules/auth/demo-users";
import { courses as seedCourses } from "../../../modules/courses/demo-courses";
import { getPostgresDatabase } from "./client";
import {
  courseLocations,
  courseSources,
  courses,
  featureFlags,
  roles,
  users,
} from "./schema";

const database = getPostgresDatabase();

await database
  .insert(roles)
  .values([
    role("70000000-0000-4000-8000-000000000001", "PLAYER", "Player"),
    role("70000000-0000-4000-8000-000000000002", "COURSE_STAFF", "Course staff"),
    role("70000000-0000-4000-8000-000000000003", "COURSE_OWNER", "Course owner or manager"),
    role("70000000-0000-4000-8000-000000000004", "TOURNAMENT_DIRECTOR", "Tournament director"),
    role("70000000-0000-4000-8000-000000000005", "LEAGUE_ADMIN", "League administrator"),
    role("70000000-0000-4000-8000-000000000006", "INSTRUCTOR", "Instructor or coach"),
    role("70000000-0000-4000-8000-000000000007", "PLATFORM_ADMIN", "Platform administrator"),
  ])
  .onConflictDoNothing();

await database
  .insert(users)
  .values(
    demoUsers.map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      authProviderSubject: `demo:${user.id}`,
    })),
  )
  .onConflictDoNothing();

await database
  .insert(courses)
  .values(
    seedCourses.map((course) => ({
      id: course.id,
      slug: course.slug,
      name: course.name,
      description: course.shortDescription,
      claimStatus: course.claimStatus,
      dataVerificationStatus: course.dataVerificationStatus,
      holeCount: course.holeCount,
      difficulty: course.difficulty,
      priceType: course.priceType,
      isFictionalDemo: course.fictionalDemo,
      publishedAt: new Date(course.lastReviewedAt),
    })),
  )
  .onConflictDoNothing();

await database
  .insert(courseLocations)
  .values(
    seedCourses.map((course, index) => ({
      id: `80000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      courseId: course.id,
      addressLine1: course.addressLine1,
      city: course.city,
      regionCode: course.state,
      postalCode: course.postalCode,
      countryCode: course.countryCode,
      latitude: course.latitude.toFixed(6),
      longitude: course.longitude.toFixed(6),
      coordinates: { x: course.longitude, y: course.latitude },
      precision: course.fictionalDemo ? "FICTIONAL_DEMO" : "APPROXIMATE",
    })),
  )
  .onConflictDoNothing();

await database
  .insert(courseSources)
  .values(
    seedCourses.map((course, index) => ({
      id: `90000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      courseId: course.id,
      sourceName: course.sourceName,
      sourceUrl: course.sourceUrl,
      sourceType: course.sourceType,
      externalId: course.slug,
      attribution: course.fictionalDemo
        ? "FlightForge fictional demonstration data"
        : "Factual seed fields only; no partnership implied",
      lastVerifiedAt: new Date(course.lastReviewedAt),
    })),
  )
  .onConflictDoNothing();

await database
  .insert(featureFlags)
  .values([
    flag("course_discovery", true, "Public course discovery and source attribution"),
    flag("course_claims", true, "Course claim submission and administrator review"),
    flag("tee_time_booking", false, "Availability, quote, and reservation workflow"),
    flag("offline_scoring", false, "Local-first scorecards and sync"),
    flag("ai_caddie", false, "Structured, explainable shot recommendations"),
    flag("media_coaching", false, "Consent-gated private media analysis"),
    flag("platform_fees", false, "Future marketplace platform fees"),
  ])
  .onConflictDoNothing();

console.log(`Seeded ${seedCourses.length} courses and ${demoUsers.length} fictional demo identities.`);

function role(
  id: string,
  code: "PLAYER" | "COURSE_STAFF" | "COURSE_OWNER" | "TOURNAMENT_DIRECTOR" | "LEAGUE_ADMIN" | "INSTRUCTOR" | "PLATFORM_ADMIN",
  name: string,
) {
  return { id, code, name, description: `${name} role for FlightForge authorization.` };
}

function flag(key: string, enabled: boolean, description: string) {
  return { key, enabled, description };
}
