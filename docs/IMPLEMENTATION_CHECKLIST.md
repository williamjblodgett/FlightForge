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
- [x] Dependency audit gate, CodeQL scan workflow, and Dependabot updates
- [x] Provider-aware logout, visible desktop/mobile sign-out, and return-path hardening
- [x] Production response security headers and authenticated no-store behavior

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

## GitHub Pages interactive edition

- [x] Static hosting build with repository-relative asset paths
- [x] Responsive desktop and task-oriented mobile navigation
- [x] PWA manifest, service worker, and local-first state restoration
- [x] Searchable course map/list, current-location sorting, favorites, and attribution
- [x] Capacity-safe booking, locked quotes, idempotent confirmation, and waitlist preview
- [x] Public/private group creation and local join-state controls
- [x] Offline nine-hole scorekeeping, versioned corrections, and basic statistics
- [x] Digital bag CRUD, coverage/overlap intelligence, and owned-disc-aware caddie
- [x] Tournament registration and league standings with fictional data labels
- [x] Owner condition controls and transparent dynamic-pricing simulator
- [x] CSV change preview, duplicate blocking, batch history, and rollback
- [x] Media upload-safety gate with consent and minor-user checks
- [x] Personal data export, two-step deletion, privacy controls, and readiness disclosure
- [x] Explicit device-demo sign-out and re-entry state
- [x] GitHub Actions Pages deployment workflow and artifact tests

## Remaining production launch gates

- [ ] Wire public application workflows to PostgreSQL repository adapter
- [ ] Public account creation and social OAuth outside Sites
- [ ] Persist booking, group, round, bag, event, and import workflows across devices
- [ ] Connect verified course inventory, email/push delivery, and operator calendars
- [ ] Add Stripe Connect sandbox, marketplace ledger, payouts, tax, refunds, and disputes
- [ ] Add private object storage, malware scanner, isolated transcoding, and retention jobs
- [ ] Connect an approved multimodal provider only after consent and safety review
- [ ] Complete independent security assessment, operational readiness, and legal review
