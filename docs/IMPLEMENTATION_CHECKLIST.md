# Implementation checklist

## Foundation

- [x] New repository initialized with locked dependencies
- [x] Replaceable brand configuration
- [x] Responsive design system and mobile navigation
- [x] Hosted identity abstraction and signed local demo sessions
- [x] Central roles, permissions, and server-side authorization
- [x] D1/R2 hosted first-slice persistence
- [x] PostgreSQL/PostGIS normalized schema, migration, and seed
- [x] Feature-flag records with monetization disabled
- [x] Safe API errors, origin checks, and rate limits
- [x] Unit, integration, type, lint, and build scripts
- [x] CI workflow

## Maine discovery vertical slice

- [x] Versioned CSV and JSON import formats
- [x] Source attribution and last-reviewed timestamps
- [x] Duplicate-candidate detection and change preview CLI
- [x] Reviewed representative Maine dataset
- [x] Clearly labeled fictional verified course
- [x] Responsive textual search and filters
- [x] Split, list, and map views
- [x] Course cards and course detail pages
- [x] Persistent favorites
- [x] Exact unclaimed-listing notice
- [x] Course-claim application
- [x] Private evidence upload and administrator download
- [x] Administrator claim-review interface and required reason
- [x] Administrator import-review interface

## Intentionally deferred

- [ ] Wire public application workflows to PostgreSQL repository adapter
- [ ] Live map provider, clustering, current location, and search-this-area
- [ ] Public account creation/social OAuth outside Sites
- [ ] Booking, capacity, quotes, payments, groups, and waitlists
- [ ] Offline scoring, statistics, ratings, events, leagues, bag, and AI
- [ ] Full import apply/rollback mutations
- [ ] Malware scanner, retention jobs, export/deletion workflows, and legal review
