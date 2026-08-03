# Maine course research ledger

Research was refreshed on August 3, 2026. The statewide import contains 120 current public-directory listings. Sixty-eight were independently matched to the PDGA directory using normalized name, city, and geographic proximity. Seventeen layouts were additionally reviewed against current course-operator or facility-owner pages.

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

The ledger should be refreshed on a schedule, stale observations should be flagged, and claimed operators should be able to publish live conditions. A manual call/email review of every unclaimed private property is still required before FlightForge describes any directory-only listing as operator verified.
