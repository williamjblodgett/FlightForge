# Deployment

## Sites deployment

`.openai/hosting.json` declares logical `DB` and `MEDIA` bindings. Sites creates the physical D1 database and private R2 bucket, injects identity, saves immutable versions, and builds the Vinext Cloudflare Worker output.

Before publishing:

1. Keep demo authentication disabled.
2. Configure `PLATFORM_ADMIN_EMAILS` and `COURSE_OWNER_EMAILS` through hosted environment settings.
3. Run type checking, linting, unit tests, the production build, and rendered integration tests.
4. Inspect generated D1 and PostgreSQL migrations.
5. Confirm access policy before exposing administrator routes.

## Standalone production target

For a conventional Next.js deployment, connect the course/favorite/claim repository to `packages/database/src/client.ts`, apply the PostgreSQL migration, use private S3-compatible storage, and replace dispatch-owned sign-in with an established public identity provider. Do not ship the D1 demo adapter as the only production source of truth outside Sites.

## Environments

| Environment | Data | Identity | Payments / AI |
| --- | --- | --- | --- |
| Local | D1/R2 emulators; optional PostGIS | Signed demo sessions | Disabled/mock |
| Test | Isolated bindings | Test identities | Disabled/mock |
| Staging | Isolated D1/R2 or staging PostGIS | Hosted sign-in, restricted access | Provider sandbox only |
| Production | PostGIS target plus private object storage | Hosted or established external identity | Disabled until separate launch review |

## Rollback

Sites versions are immutable and can be redeployed. Import batches retain IDs and applied/rolled-back timestamps in the PostgreSQL model. The current reviewed seed is version-controlled; a live import apply/rollback mutation is not implemented yet.
