# API contracts

All responses avoid raw database errors. Errors use:

```json
{
  "error": {
    "code": "STABLE_MACHINE_CODE",
    "message": "Safe user-facing message",
    "details": {},
    "requestId": "uuid"
  }
}
```

## Implemented routes

### `POST /api/auth/signup`, `POST /api/auth/login`, and `GET /auth/callback`

When Supabase is configured, signup issues a short-lived consent nonce, records the configured Terms and Privacy versions, creates a hosted identity, sends a verification redirect, and exchanges the PKCE confirmation for secure server cookies. Provisioning rejects identities that lack the app-issued signup intent. Login rejects unverified hosted identities. A verified hosted email that collides with a pre-existing D1 account is never silently linked; the user must complete the explicit account-link flow. During the controlled migration window, existing D1 credentials remain available as a fallback.

### `POST /api/auth/reset-password` and `PUT /api/auth/update-password`

Supabase-backed recovery returns an enumeration-resistant accepted response. The callback creates a short-lived, one-time server recovery intent; password replacement requires and consumes that intent in addition to the current recovery session before accepting a strong password.

### `POST /api/auth/demo`

Local-only demo authentication. Requires same-origin request, explicit enablement, a 32+ character signing secret, and IP-keyed rate limiting. Returns the fictional demo user and writes a signed HTTP-only cookie.

### `DELETE /api/auth/demo`

Clears the local demo cookie after a same-origin check.

### `POST /api/favorites/:courseId`

Authenticated toggle. Requires player permission, exact course ID, same-origin request, and rate limit. Returns `{ "favorited": true | false }`.

### `POST /api/claims`

Authenticated multipart claim submission. Validates contact fields, authority statement, course state, duplicate application constraint, and optional PDF/PNG/JPEG evidence by size and file signature. Successful status is 201.

### `PATCH /api/admin/claims/:claimId`

Platform-administrator-only review. Requires one allowed transition and a written reason. Appends an audit event and increments the optimistic version.

### `GET /api/admin/claims/:claimId/evidence`

Platform-administrator-only evidence proxy. Streams private R2 bytes with `private, no-store` and `nosniff` headers. There is no public object URL.

### `GET|POST /api/events`

GET lists public published/cancelled organizer records. POST requires a verified coordinator role, same-origin request, runtime feature flag, rate limit, validated future schedule, and a 16-100 character idempotency key. It saves either a private draft or an immediately public event.

### `PUT|PATCH /api/events/:eventId`

Organizer-owner or platform-administrator update. PUT validates and replaces editable facts; PATCH changes publish state with a required reason. Both enforce optimistic versions and atomically append event and platform audit entries.

### `GET|POST /api/bag` and `PUT|DELETE /api/bag/:discId`

Authenticated owner-scoped physical-disc inventory. Catalog-backed records retain a rating-version reference; custom records require four printed flight numbers. Updates and soft deletion use optimistic versions, same-origin checks, rate limits, conditional bag-slot writes, and audit entries.

### `GET /api/discs/catalog`

Returns the reviewed sourced catalog baseline. Search is bounded and each record includes the rating source, source URL, checked timestamp, and version identifier.

### `POST /api/caddie/recommendations`

Requires the caddie feature flag and the user's AI-recommendation preference. Stores a validated, explainable rules-engine result and its model/schema provenance without relying on an external AI provider.

### `POST /api/caddie/recommendations/:recommendationId/feedback`

Accepts one owner-authorized representative observation for the recommended physical disc. Duplicate feedback is constrained and the private disc profile is updated for future recommendations.

### Community and messaging

- `GET /api/community` returns the adult-access state, privacy summary, curated channels, member conversations, and discoverable players.
- `POST /api/community/attestation` records the current adult self-attestation and community-guidelines version.
- `GET|POST /api/community/conversations` lists member conversations or creates a direct message, private group, or validated course/event channel.
- `GET|POST /api/community/conversations/:conversationId/messages` paginates member-visible messages or sends a validated message. Sends require a 16–100 character `Idempotency-Key`.
- `PATCH /api/community/conversations/:conversationId` marks read, mutes, unmutes, joins a public channel, or leaves a conversation.
- `POST|DELETE /api/community/blocks` adds or removes a two-way contact boundary.
- `POST|PATCH|DELETE /api/community/connections` manages player connection requests.
- `POST /api/community/reports` reports an accessible user, conversation, or message.
- `GET /api/community/admin/reports` and `PATCH /api/community/admin/reports/:reportId` require a platform administrator and record reasoned moderation actions.

Every route checks the `community_chat` feature flag and a verified, linked, onboarded account. Messaging additionally enforces current adult attestation, active membership, privacy, blocks, sanctions, rate limits, bounded text, and safe error envelopes.

### `GET|PUT|POST /api/rounds/active`

GET retrieves or creates the signed-in player’s active event round. PUT records one hole score with strokes, penalties, the expected round version, and a unique client mutation identifier. Replayed mutations return the saved round; version conflicts return the current server round for a visible client merge. Every accepted correction appends a score-audit record. POST completes a fully scored, fully synchronized round through an idempotent conditional transition and appends a completion audit event.

## Idempotency

Event creation and community message sends require dedicated idempotency keys. Offline score updates carry unique client mutation identifiers and optimistic versions. Favorites are naturally toggles and claim duplication is constrained per applicant/course. Dedicated idempotency keys are still required for future booking, payments, refunds, registrations, imports, and media-analysis jobs.
