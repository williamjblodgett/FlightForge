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

## Idempotency

Event creation requires a dedicated idempotency key; favorites are naturally toggles and claim duplication is constrained per applicant/course. Dedicated idempotency keys are still required for future booking, payments, refunds, registrations, imports, and media-analysis jobs.
