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

## Idempotency

Favorites are naturally toggles and claim duplication is constrained per applicant/course. Dedicated idempotency keys are still required for future booking, payments, refunds, registrations, imports, and media-analysis jobs.
