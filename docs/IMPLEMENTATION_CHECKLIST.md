# Implementation checklist

## Foundation

- [x] New repository initialized with locked dependencies
- [x] Replaceable brand configuration
- [x] Responsive design system and mobile navigation
- [x] Original optimized hero artwork, refreshed social preview, and non-deceptive course-map art
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
- [x] Fail-closed fictional fixture isolation; real Maine listings cannot inherit demo inventory or verification
- [x] Public/private group creation and local join-state controls
- [x] Offline nine-hole scorekeeping, versioned corrections, per-hole context, explicit finish flow, and basic statistics
- [x] Digital bag CRUD, coverage/overlap intelligence, and owned-disc-aware caddie
- [x] Tournament registration and league standings with fictional data labels
- [x] Owner condition controls and transparent dynamic-pricing simulator
- [x] CSV change preview, duplicate blocking, batch history, and rollback
- [x] Media upload-safety gate with consent and minor-user checks
- [x] Personal data export, two-step deletion, privacy controls, and readiness disclosure
- [x] Editable player basics and persisted device-local privacy settings with version-two migration
- [x] Interactive lesson reader and persisted progress
- [x] Mobile overflow navigation, post-route scroll restoration, collapsible map, and labeled form controls
- [x] Course-owner and platform-administrator simulation boundaries
- [x] Explicit device-demo sign-out and re-entry state
- [x] GitHub Actions Pages deployment workflow and artifact tests

## Production event, bag, and caddie activation

- [x] Coordinator-only event create button and private draft workflow
- [x] Public live event board and indexable event detail pages
- [x] Organizer ownership isolation, administrator override, optimistic locking, and audit reasons
- [x] Idempotent event creation and publish/unpublish/cancel lifecycle
- [x] Persistent per-user physical disc CRUD and primary-bag membership
- [x] Reviewed manufacturer-sourced starter catalog with import validation and attribution
- [x] Immutable rating versions plus plastic, weight, wear, condition, dome, and run metadata
- [x] Explainable owned-disc caddie with calibrated confidence, risks, and alternatives
- [x] Representative throw feedback and private per-disc learning profiles
- [x] Runtime feature controls for event publishing, digital bags, and caddie
- [x] Responsive event publisher, event board, inventory workspace, and caddie UI
- [x] D1 migrations, schema verification, authorization/validation tests, lint, typecheck, and production build

## Remaining production launch gates

- [ ] Wire public application workflows to PostgreSQL repository adapter
- [ ] Public account creation and social OAuth outside Sites
- [ ] Persist booking, group, round, and full import-review apply/rollback workflows across devices
- [ ] Connect verified course inventory, email/push delivery, and operator calendars
- [ ] Add Stripe Connect sandbox, marketplace ledger, payouts, tax, refunds, and disputes
- [ ] Add private object storage, malware scanner, isolated transcoding, and retention jobs
- [ ] Connect an approved multimodal provider only after consent and safety review
- [ ] Complete independent security assessment, operational readiness, and legal review
