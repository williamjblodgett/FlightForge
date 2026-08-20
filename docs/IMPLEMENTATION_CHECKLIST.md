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
- [x] Supabase Auth adapter with verified-email signup, PKCE callback, recovery, and explicit identity linking
- [x] App-bound hosted consent records, one-time password recovery intents, and fail-closed multi-provider session handling
- [x] Community-safe session requirements that reject unverified or incompletely linked identities

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

## New England evidence expansion

- [x] Five-state primary-source-only launch batch
- [x] State and regional discovery pages
- [x] State and evidence-level search filters
- [x] Facility grouping for multi-course properties
- [x] Field-level evidence, location precision, and re-review dates
- [x] D1 and PostgreSQL evidence migrations plus Supabase read policies
- [x] Regional validation CLI and unit tests
- [x] Uniformly triage all 468 six-state directory candidates with source health and explicit publication outcomes
- [x] Refresh and evidence-tier all 120 Maine records without inflating directory evidence into operator verification
- [ ] Obtain primary owner or public-agency evidence for the 333 withheld expansion candidates
- [ ] Add operator outreach and correction-case workflow after communication approval

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

## Community and field scoring

- [x] Adult-attested Community hub with New England and six state clubhouses
- [x] Direct messages, private groups, course/event channels, connections, unread state, mute, leave, and drafts
- [x] Two-way blocks, message privacy, local safety screening, reports, moderation queue, reasons, and audit records
- [x] Server-enforced message membership, per-user idempotency, pagination, rate limits, and feature flag
- [x] Responsive Messages workspace, accessible dialogs, mobile thread navigation, and active-round chat access
- [x] IndexedDB-first score persistence with a local-storage journal and guest-device fallback
- [x] Cross-device score synchronization, optimistic versions, conflict surfacing, and correction history
- [x] Aces, scores through 99, penalty strokes, accessible announcements, compact mobile HUD, and resume-round cards
- [x] Idempotent Finish Round transition with full-hole, synchronization, and completion-audit requirements
- [x] D1 community and scoring migration plus prepared Supabase/PostgreSQL tables and non-recursive RLS policies

## Remaining production launch gates

- [x] Guided camera capture, saved-video fallback, evidence-aware practice guide, and honest confidence limits
- [x] Private coaching R2 uploads with D1 metadata, consent records, expiration choices, signature validation, and user deletion
- [x] GPS rangefinder with accuracy radius, owner-coordinate workflow, and official satellite-view handoff

- [ ] Complete public-workflow repository cutover from hosted D1 to Supabase PostgreSQL
- [x] Initialize Supabase PostGIS/security foundation and seed the 135 reviewed public course records
- [ ] Configure server-only Supabase credentials and transaction-pooler `DATABASE_URL`
- [ ] Prove full D1/PostgreSQL repository parity, identity linking, backup, rollback, and cutover rehearsal
- [ ] Activate production Supabase SMTP/contact settings and rehearse verified-email recovery; social OAuth and MFA remain provider work
- [ ] Persist booking, group, and full import-review apply/rollback workflows across devices (round scoring is now persistent)
- [ ] Connect verified course inventory, email/push delivery, and operator calendars
- [ ] Add Stripe Connect sandbox, marketplace ledger, payouts, tax, refunds, and disputes
- [ ] Add third-party malware scanning, isolated transcoding, and a scheduled global retention sweep (per-user expiry cleanup is active)
- [ ] Connect pose-landmark and approved multimodal providers only after coach benchmark, consent, and safety review
- [ ] Complete independent security assessment, operational readiness, and legal review
