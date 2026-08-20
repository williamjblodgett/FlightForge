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
- `hosted_signup_intents`
- `password_recovery_intents`

Organization-scoped roles are represented by `user_roles.organization_id`. Role definitions and permission checks remain centralized in application code for this slice.

`users.supabase_auth_user_id` is the explicit link to `auth.users`. It is unique and nullable during migration; application code never claims an existing account from an unverified email match. `hosted_signup_intents` bind provider provisioning to an app-issued consent nonce and configured legal-policy versions. `password_recovery_intents` are hashed, expire after 15 minutes, and are consumed once before password replacement.

### Player privacy and community

- `player_privacy_settings`
- `consent_records`
- `community_user_status`
- `player_connections`
- `blocked_users`
- `conversations`
- `conversation_members`
- `messages`
- `reports`
- `moderation_actions`

Curated regional/state channels use stable UUIDs in both D1 and PostgreSQL. Course and event channels are created only after validating a published application record. Message idempotency is unique per sender, reads require active conversation membership, blocks apply in both directions, and moderator actions retain the report, actor, reason, target, and optional duration.

### Active rounds and offline synchronization

`rounds`, `round_players`, `scorecards`, `hole_scores`, and `round_score_audit_events` persist active scorecards. `rounds.last_mutation_id` makes the optimistic update and its dependent D1 batch auditable; `client_mutation_id` prevents replayed hole changes. A conditional finish transition requires every hole, rejects unsynchronized versions, changes the status to `COMPLETED`, and appends a completion audit event. The browser keeps an owner-scoped schema-versioned mirror in IndexedDB with a local-storage write journal when IndexedDB is unavailable.

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
- hosted-signup consent intents and one-time password-recovery intents;
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
- community status, connections, blocks, conversations, membership, messages, reports, and moderation actions;
- active event rounds, hole scores, client mutation identifiers, and correction audit history.

Private evidence bytes live in R2. Public course facts remain version-controlled seed data until PostgreSQL becomes the active runtime adapter.

`drizzle/0003_domain_foundation.sql` also establishes schema-ready tables for all remaining bounded domains. See [database coverage](DATABASE_COVERAGE.md). These tables are disabled foundations, not claims of live feature behavior.

Course evidence now records facility identity, course-versus-layout type, location precision, source-supported fields, source validity, and the next review deadline. `course_evidence` provides field-level provenance in both D1 and PostgreSQL. See [New England data policy](NEW_ENGLAND_DATA_POLICY.md).

`hole_highlight_videos` connects a private video object to a course, event, and hole. It stores uploader attribution, duration, consent assertions, moderation state, an idempotency key, timestamps, and soft-deletion state. Video bytes remain in private object storage rather than the relational database. See [Hole highlight videos](HOLE_HIGHLIGHTS.md).

## Future repositories

Booking, pricing, payments, public playing groups, aggregate statistics, ratings, leagues, media analysis, learning, notifications, and commerce have D1 foundations but do not yet have complete server repositories or provider integrations. Event publishing, bags, deterministic caddie recommendations, community messaging, moderation, and active-round score synchronization are active. Multimodal AI and external model providers remain separate disabled capabilities. The next activation should be shared booking inventory with transaction-level authorization and integration tests.
