# Data model

The authoritative production schema is [packages/database/src/schema.ts](../packages/database/src/schema.ts). UUIDs are used for globally unique records. Mutable entities include timestamps, soft-delete fields where justified, and version fields on conflict-prone workflows.

## Implemented PostgreSQL domains

### Identity and access

- `users`
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`
- `organizations`
- `organization_memberships`

Organization-scoped roles are represented by `user_roles.organization_id`. Role definitions and permission checks remain centralized in application code for this slice.

### Courses and geography

- `courses`
- `course_locations`
- `amenities`
- `course_amenities`
- `course_sources`
- `favorite_courses`

`course_locations` keeps human-readable location columns plus numeric latitude/longitude and a PostGIS `geometry(point)` value. A GiST index supports radius and bounding-box queries. Country and region codes avoid Maine-only assumptions.

### Claims and audit

- `course_claims`
- `course_claim_audit_events`

Claim state uses the six required states. Review mutations require a reason, use optimistic versions, and append an audit event. Supporting documents store only a private object key.

### Imports and operations

- `import_batches`
- `import_records`
- `feature_flags`
- `audit_logs`

Import records retain original normalized payloads, validation errors, possible matches, batch status, apply timestamps, and rollback targeting.

## Hosted persistence

D1 contains active repositories for:

- password credentials and revocable hashed sessions;
- user roles, player profiles, preferences, privacy settings, and consent records;
- course sources and status observations;
- favorites;
- course claims;
- immutable claim audit events at the application layer;
- import-batch summary;
- hashed rate-limit counters.
- organizer-owned `events` and `event_audit_events` with idempotency and optimistic versions;
- sourced catalog records, versioned disc ratings, plastic families, physical player discs, bags, and bag slots;
- private per-disc throw profiles and observations;
- AI caddie sessions, recommendations, and feedback with model/schema provenance.

Private evidence bytes live in R2. Public course facts remain version-controlled seed data until PostgreSQL becomes the active runtime adapter.

`drizzle/0003_domain_foundation.sql` also establishes schema-ready tables for all remaining bounded domains. See [database coverage](DATABASE_COVERAGE.md). These tables are disabled foundations, not claims of live feature behavior.

## Future repositories

Booking, pricing, payments, groups, rounds, statistics, ratings, leagues, media analysis, learning, notifications, moderation, and commerce have D1 tables but do not yet have complete server repositories or provider integrations. Event publishing, bags, and the deterministic caddie are active; multimodal AI and external model providers remain separate disabled capabilities. The next activation should be cross-device booking/scoring with transaction-level authorization and integration tests.
