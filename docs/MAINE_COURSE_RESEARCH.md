# Maine course research ledger

Research was refreshed uniformly on August 8, 2026. The statewide import contains 120 current public-directory listings. Sixty-eight remain independently matched to the PDGA directory using normalized name, city, and geographic proximity. Sixteen course records are additionally reviewed against current course-operator or facility-owner pages.

The refresh produced no added or removed records and no changes to names, cities, coordinates, hole counts, availability classifications, access notes, cost notes, or PDGA matches. The uniform audit ledger is `data/import/new-england-course-evidence-audit.json`; it preserves the lower evidence tier for the other 104 Maine records rather than implying operator confirmation.

## Evidence policy

- `OPERATOR_CONFIRMED_AVAILABLE` means an operator/facility page currently publishes the course; it does not guarantee the gate is open at this moment.
- `OPERATOR_CONFIRMED_SEASONAL` means the operator publishes a current seasonal window.
- `AVAILABLE_REPORTED` and `SEASONAL_AVAILABLE` are directory observations, not operator confirmation.
- `UNAVAILABLE_REPORTED` preserves a directory listing that currently reports unavailable rather than silently deleting it.
- Weather, maintenance, private events, daylight, and same-day closures can change after review. Players are told to check the linked source before travel.

The source files are `data/import/maine-courses.statewide.json` and `data/import/maine-course-authoritative-overrides.json`. Each row retains its source URL and checked timestamp. Coordinates are directory coordinates and are shown as approximate.

## Copyright and partnership boundary

The import copies only factual fields needed for discovery: name, city, state, coordinates, hole count, access/cost note, availability class, source URL, and timestamps. It does not copy descriptions, photos, reviews, ratings, or proprietary maps. Source attribution does not imply partnership with UDisc, PDGA, a course, municipality, or operator.

## Operational follow-up

The ledger should be refreshed on a schedule, stale observations should be flagged, and claimed operators should be able to publish live conditions. Manual operator outreach is still required before FlightForge describes any of the 104 directory-only listings as operator verified.
