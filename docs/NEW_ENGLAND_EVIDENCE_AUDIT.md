# New England evidence audit

FlightForge completed a uniform six-state directory and source-health audit on August 8, 2026.

## Results

| State | Candidates |
| --- | ---: |
| Maine | 120 |
| Massachusetts | 116 |
| New Hampshire | 70 |
| Vermont | 86 |
| Connecticut | 68 |
| Rhode Island | 8 |
| **Total** | **468** |

- 31 records have approved owner, facility, or public-agency evidence.
- 52 Maine records are directory cross-checked.
- 52 Maine records have one current directory source.
- 333 non-Maine candidates are withheld pending primary evidence.
- 552 of 553 cited URLs responded to the automated source-health check.
- The remaining municipal URL returned HTTP 403 and requires manual review; it is not treated as proof of closure.

## Interpretation

The audit is complete because every discovered candidate has a recorded outcome. It does not mean every candidate is publishable or operator verified. Outside Maine, a directory entry remains unpublished unless a current owner, facility, municipal, park, school, or university source supports identity and location.

Maine retains its legacy launch listings with their actual evidence tier visible. Sixteen Maine course records currently have approved operator or facility sources; the other 104 require operator outreach before they may be described as operator verified.

No source-supported availability status is an open-now guarantee. Weather, maintenance, private events, seasonal schedules, daylight, and access restrictions may change after review.

## Reproduction

```powershell
npm run courses:research:new-england
npm run courses:audit:sources
npm run courses:audit:build
npm run courses:audit:validate
```

The committed audit is `data/import/new-england-course-evidence-audit.json`. Raw refreshed directory and HTTP-health snapshots remain working artifacts and are not required by the application.

## Published database subset

The application publishes the 120 Maine launch records and the 15 non-Maine records that passed the stricter primary-source gate. The remaining 333 expansion candidates are retained in the evidence ledger with a withheld outcome; they are not silently promoted into public course inventory. The idempotent Supabase seed generator mirrors that 135-record public subset without weakening the evidence policy.
