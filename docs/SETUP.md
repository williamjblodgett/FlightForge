# Local setup

## Requirements

- Node.js 22.13+
- npm 10+
- Docker Desktop only if running PostgreSQL/PostGIS locally

## Application runtime

1. Copy `.env.example` to `.env`.
2. Replace all `replace-*` values.
3. Set a random `DEMO_AUTH_SECRET` of at least 32 characters for local role testing.
4. Run `npm install`.
5. Run `npm run dev`.
6. Open the exact local URL printed by the server.

The Vinext local runtime owns D1/R2 emulator state under ignored project directories. Favorites, claim applications, evidence, audit events, and rate limits survive page reloads.

## PostgreSQL/PostGIS

1. Set `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` in `.env`.
2. Make `DATABASE_URL` match those values.
3. Run `docker compose up -d postgres`.
4. Run `npm run db:migrate:postgres`.
5. Run `npm run seed:postgres`.

The first migration enables PostGIS before creating geographic columns and indexes.

## Import validation

`npm run seed:validate` validates the reviewed JSON batch, previews intended changes, and reports duplicate candidates. The standalone script accepts either the versioned JSON format or the provided CSV columns.

## Required environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL adapter | Server-only connection string |
| `DEMO_AUTH_ENABLED` | Local demo only | Enables fictional demo identities |
| `DEMO_AUTH_SECRET` | When demo auth is enabled | HMAC signing key, 32+ characters |
| `PLATFORM_ADMIN_EMAILS` | Hosted admin access | Comma-separated exact emails |
| `COURSE_OWNER_EMAILS` | Hosted owner access | Comma-separated exact emails |
| `NEXT_PUBLIC_APP_URL` | Deployment metadata | Public application origin |

Mapbox, Stripe, and AI variables are placeholders for disabled feature modules. Never place server secrets in a `NEXT_PUBLIC_*` variable.
