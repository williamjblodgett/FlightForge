import { describe, expect, it } from "vitest";
import { eventLocalTime, eventTimeToIso } from "./zoned-time";

describe("venue time zone conversion",()=>{
  it.each([
    ["2026-09-28T09:00","America/New_York","2026-09-28T13:00:00.000Z"],
    ["2026-01-28T09:00","America/New_York","2026-01-28T14:00:00.000Z"],
    ["2026-09-28T09:00","America/Los_Angeles","2026-09-28T16:00:00.000Z"],
    ["2026-09-28T09:00","Pacific/Honolulu","2026-09-28T19:00:00.000Z"],
    ["2026-09-28T09:00","Asia/Kathmandu","2026-09-28T03:15:00.000Z"],
  ])("round-trips %s in %s",(local,zone,iso)=>{
    expect(eventTimeToIso(local,zone)).toBe(iso);
    expect(eventLocalTime(iso,zone)).toBe(local);
  });
  it("rejects missing and ambiguous DST hours instead of silently shifting",()=>{
    expect(()=>eventTimeToIso("2026-03-08T02:30","America/New_York")).toThrow(/does not exist/u);
    expect(()=>eventTimeToIso("2026-11-01T01:30","America/New_York")).toThrow(/occurs twice/u);
    expect(eventTimeToIso("2026-11-01T01:30","America/New_York","2026-11-01T06:30:00.000Z")).toBe("2026-11-01T06:30:00.000Z");
  });
  it("rejects invalid dates",()=>{
    for(const value of ["","not a date","2026-02-30T12:30","2026-09-28T29:00"]) expect(()=>eventTimeToIso(value,"America/New_York")).toThrow();
  });
});
