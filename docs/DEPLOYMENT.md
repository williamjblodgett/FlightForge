# Deployment

## GitHub Pages edition

The repository includes a static, installable demonstration under `pages-demo/`. It intentionally keeps mutable data in validated browser storage and does not embed server credentials.

1. Run `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e`, and `npm audit`.
2. Push to a repository with GitHub Pages enabled.
3. In **Settings → Pages**, choose **GitHub Actions** as the source.
4. The `Deploy FlightForge Pages Demo` workflow builds `pages-dist/`, uploads the artifact, and deploys it.
5. Verify the workflow's `page_url`, installability, navigation, refresh behavior, and offline score restoration.

The workflow derives the project-site base path from `GITHUB_REPOSITORY`. Do not add authentication secrets, payment keys, AI keys, private media, or production user data to a Pages deployment; all downloaded assets and browser JavaScript are public.

## Sites deployment

`.openai/hosting.json` declares logical `DB` and `MEDIA` bindings. Sites creates the physical D1 database and private R2 bucket, injects identity, saves immutable versions, and builds the Vinext Cloudflare Worker output.

`sites-deploy.yml` now follows a successful `main` CI run. Configure the protected production secret `SITES_DEPLOY_HOOK_URL` and variable `SITES_PRODUCTION_URL`; until the hook is configured, the workflow reports that automation is paused and exits cleanly. Each health response exposes a non-secret release identifier. Set `RELEASE_ID` to the full Git commit SHA before saving a Sites version because Sites snapshots build-time environment values when the version is created.

Before publishing:

1. Keep demo authentication disabled.
2. Configure `PLATFORM_ADMIN_EMAILS`, `COURSE_OWNER_EMAILS`, `EVENT_COORDINATOR_EMAILS`, and `LEAGUE_ADMIN_EMAILS` through hosted environment settings.
3. Run type checking, linting, unit tests, the production build, rendered integration tests, `npm run test:e2e`, `npm run db:validate`, and `npm run catalog:validate`.
4. Inspect generated D1 and PostgreSQL migrations. Confirm the `digital_bag`, `ai_caddie`, `event_publishing`, `camera_coach`, and `community_chat` records are enabled only in intended environments.
5. Confirm access policy before exposing administrator or coordinator routes.
6. Smoke-test event draft/publish/unpublish, physical-disc add/edit/remove, caddie failure fallback, JPhillips forced password replacement, offline score recovery and Finish Round, adult community access, channel joining, message send/report/block, and administrator moderation after deployment.

## Standalone production target

For a conventional Next.js deployment, port the active course/favorite/claim/event/bag/caddie/community/round repositories to `packages/database/src/client.ts`, apply PostgreSQL parity migrations, use private S3-compatible storage, and activate the prepared Supabase Auth adapter with production SMTP and callback settings. The D1 adapter is production-backed for Sites but is not the standalone Postgres adapter.

## Environments

| Environment | Data | Identity | Payments / AI |
| --- | --- | --- | --- |
| Local | D1/R2 emulators; optional PostGIS | Signed demo sessions | Disabled/mock |
| Test | Isolated bindings | Test identities | Disabled/mock |
| Staging | Isolated D1/R2 or staging PostGIS | Hosted sign-in, restricted access | Provider sandbox only |
| Production | PostGIS target plus private object storage | Hosted or established external identity | Disabled until separate launch review |

## Rollback

GitHub Pages can be rolled back by reverting the source commit and rerunning the workflow. Sites versions are immutable and can be redeployed. Import batches retain IDs and applied/rolled-back timestamps in the PostgreSQL model. The Pages edition also demonstrates reversible device-local batches; it does not modify a shared catalog.

Before the Supabase cutover, rehearse `pg_dump --format=custom`, restore that artifact into an isolated rehearsal database with `pg_restore --clean --if-exists`, run the migration journal and data-quality checks there, then record row counts and the tested release ID. Production restoration and rollback remain a launch gate until credentials and an isolated rehearsal target are available.
