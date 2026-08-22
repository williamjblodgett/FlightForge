# New England course evidence policy

FlightForge covers Maine, Massachusetts, New Hampshire, Vermont, Connecticut, and Rhode Island. The public count is a count of published course records, not a claim about every course that may exist in a directory.

## Publication standard

New-state records require a current course-owner, facility, municipal, park, school, or university source confirming course identity and location. PDGA, UDisc, tourism directories, search results, and community posts can identify candidates or cross-check facts, but cannot independently publish a new-state record.

Each primary source records which facts it supports, its check date, and its next review deadline. A normal schedule never becomes an “open now” claim. Weather, maintenance, event closures, capacity closures, and private-property restrictions can still change same-day access.

## Maine transition

Maine’s 120-record launch directory remains public while records are re-reviewed. Directory-only records display their actual evidence level. A listing is soft-archived only after an administrator records evidence that it is permanently closed, nonexistent, duplicated, or materially misrepresented. A missing website alone is not closure evidence.

## Facility and course identity

Properties with multiple playable courses share a facility identifier. Each independently playable course may have its own record, season, access point, and source evidence. Tee or pin combinations that are merely layouts should not inflate the public course count.

## Location precision

- `ENTRANCE_GEOCODED`: the published entrance or check-in address was independently geocoded.
- `FACILITY_GEOCODED`: the facility or park center was independently geocoded.
- `FACILITY_APPROXIMATE`: the source confirms the facility but the public pin is approximate.
- `DIRECTORY_APPROXIMATE`: a legacy Maine coordinate still awaits primary-source review.

Coordinates are planning aids, not emergency navigation. Exact first-tee and basket geometry requires operator verification.

## Uniform six-state audit

The August 22, 2026 ledger contains 474 reviewed records: 120 ME, 117 MA, 70 NH, 88 VT, 71 CT, and 8 RI. It combines the refreshed directory snapshot with six primary-source records that were not present in that snapshot. Every record has an explicit evidence and publication outcome in `data/import/new-england-course-evidence-audit.json`.

Seventy-three records have approved primary-source evidence, including 16 Maine course records and 57 records across the other five New England states. One hundred four Maine records retain their disclosed directory-only tier. Two hundred ninety-seven non-Maine candidates are withheld pending a current owner, facility, municipal, park, school, university, or other qualified public-agency source. Classification is completion of the review ledger, not a claim that every candidate has been operator verified.

The refresh checked 595 cited URLs. Five hundred eighty-eight responded successfully. Seven government URLs rejected or did not satisfy the automated request and remain queued for manual recheck; each was separately reviewed, and an automated HTTP error is not closure evidence.

## Current reviewed expansion set

The original 2026-08-07 regional batch and the two 2026-08-22 expansion batches contain 57 primary-source-reviewed records spanning all five expansion states. Together they are the publishable expansion set. Unresolved candidates remain represented in the review ledger and stay unpublished.
