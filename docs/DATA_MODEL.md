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

## Hosted first-slice persistence

D1 contains only the operational records needed by this release:

- favorites;
- course claims;
- immutable claim audit events at the application layer;
- import-batch summary;
- hashed rate-limit counters.

Private evidence bytes live in R2. Public course facts remain version-controlled seed data until PostgreSQL becomes the active runtime adapter.

## Future entities

Booking, pricing, payments, groups, rounds, statistics, ratings, bags, events, leagues, AI, learning, notifications, moderation, and commerce are not yet migrated into PostgreSQL. Pure domain engines and versioned device-local demonstration records now exercise booking, group, round, bag, event, caddie, and import behaviors, but those records are not a substitute for server persistence. The next migration should accompany the cross-device booking/scoring vertical slice and its authorization, transaction, and integration tests.
