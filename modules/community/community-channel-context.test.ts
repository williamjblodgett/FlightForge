import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getD1Database: vi.fn(),
  getCourseById: vi.fn(),
}));

vi.mock("@/db/runtime", () => ({ getD1Database: mocks.getD1Database }));
vi.mock("@/modules/courses/demo-courses", () => ({ getCourseById: mocks.getCourseById }));

import { assertJoinablePublicChannelContext } from "./community-repository";

function databaseReturning(row: unknown): D1Database {
  return {
    prepare: vi.fn(() => ({
      bind: vi.fn(() => ({ first: vi.fn(async () => row) })),
    })),
  } as unknown as D1Database;
}

describe("public community context revalidation", () => {
  beforeEach(() => {
    mocks.getD1Database.mockReset();
    mocks.getCourseById.mockReset();
  });

  it("keeps only the fixed regional and state clubhouses joinable without a backing record", async () => {
    await expect(assertJoinablePublicChannelContext("REGION", "new-england")).resolves.toBeUndefined();
    for (const state of ["ME", "MA", "NH", "VT", "CT", "RI"]) {
      await expect(assertJoinablePublicChannelContext("STATE", state)).resolves.toBeUndefined();
    }
    await expect(assertJoinablePublicChannelContext("STATE", "NY")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.getD1Database).not.toHaveBeenCalled();
  });

  it("allows a currently published course", async () => {
    mocks.getD1Database.mockReturnValue(databaseReturning({ name: "Pine Ridge", isPublished: 1, deletedAt: null }));
    await expect(assertJoinablePublicChannelContext("COURSE", "course-1")).resolves.toBeUndefined();
  });

  it("rejects an unpublished or deleted D1 course without falling back to stale catalog data", async () => {
    mocks.getCourseById.mockReturnValue({ id: "course-1", name: "Stale catalog course" });
    mocks.getD1Database.mockReturnValue(databaseReturning({ name: "Pine Ridge", isPublished: 0, deletedAt: null }));
    await expect(assertJoinablePublicChannelContext("COURSE", "course-1")).rejects.toMatchObject({ code: "NOT_FOUND" });

    mocks.getD1Database.mockReturnValue(databaseReturning({ name: "Pine Ridge", isPublished: 1, deletedAt: "2026-08-20T00:00:00.000Z" }));
    await expect(assertJoinablePublicChannelContext("COURSE", "course-1")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.getCourseById).not.toHaveBeenCalled();
  });

  it("requires an event to remain public, published, and not deleted", async () => {
    mocks.getD1Database.mockReturnValue(databaseReturning({ title: "Summer Open" }));
    await expect(assertJoinablePublicChannelContext("EVENT", "event-1")).resolves.toBeUndefined();

    mocks.getD1Database.mockReturnValue(databaseReturning(null));
    await expect(assertJoinablePublicChannelContext("EVENT", "event-1")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
