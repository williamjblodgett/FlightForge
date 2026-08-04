# FlightForge

FlightForge is a responsive disc golf platform beginning with source-attributed Maine course discovery and designed to scale beyond the seed market. The repository contains both a server-backed application slice and a self-contained GitHub Pages edition that makes broader player and operator journeys usable without pretending static hosting is a production backend.

The server-backed application delivers a complete account-to-discovery-to-course-claim slice:

- replaceable global brand configuration;
- free password signup/login, first-run player setup, and granular privacy preferences;
- visible sign-out in the desktop header and mobile profile/setup flows, with correct hosted-identity logout;
- a player-only JPhillips shared tester plus hosted identity and gated local demo sessions;
- centralized roles and server-side authorization;
- PostgreSQL/PostGIS production schema and migrations;
- durable Sites D1/R2 adapter for the deployed first slice;
- a 120-record Maine evidence ledger, operator-source overrides, and import contracts with duplicate detection;
- responsive course search and provider-neutral map/list views;
- source-attributed course details and exact unclaimed notices;
- persistent favorites;
- private course-claim evidence upload;
- administrator claim and import review;
- unit, rendered integration, type, lint, and production-build validation.

The GitHub Pages edition adds working, device-local versions of previously deferred flows:

- capacity-safe booking with explainable, time-limited price quotes and idempotent confirmation;
- public/private playing groups and join-state controls;
- offline scorekeeping with versioned corrections and basic statistics;
- digital bag management, gap/overlap analysis, and an owned-disc-aware caddie;
- fictional tournament registration and league standings;
- owner condition updates, pricing simulation, CSV preview, duplicate detection, and rollback;
- structured learning, upload-safety validation, privacy preferences, explicit demo sign-out, data export, and local deletion;
- an installable PWA shell, responsive map/list discovery, and mobile active-round navigation.

All mutable Pages data stays in that browser. No real reservation, payment, claim, registration, course publication, or AI media analysis occurs from the static edition.

## Quick start

Prerequisites: Node.js 22.13 or newer. Docker is optional and is used only when exercising the PostgreSQL/PostGIS adapter locally.

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

The application prints its local URL. The built-in local runtime supplies persistent D1 and private R2 emulators for favorites, claims, evidence, and rate limits.

Run the GitHub Pages edition locally:

```powershell
npm run pages:dev
```

Create and verify its production artifact:

```powershell
npm run test:pages
```

The output is written to `pages-dist/` and is intentionally ignored by Git.

To exercise PostgreSQL/PostGIS as well:

```powershell
docker compose up -d postgres
npm run db:migrate:postgres
npm run seed:postgres
```

Set a strong local-only `POSTGRES_PASSWORD`, update `DATABASE_URL`, and never commit `.env` or `.env.local`.

## Demo sign-in

The public server-backed build includes a player-only shared test account:

| Player | Email | Password |
| --- | --- | --- |
| JPhillips | `jphillips@demo.flightforge.app` | `password1234` (temporary) |

It begins private, forces JPhillips to create a different private password, revokes the temporary session, and then opens profile/privacy setup. The starter password stops working after replacement. Use fictional profile details only.

For local role testing, set the demo variables below.

Set `DEMO_AUTH_ENABLED=true` and a random `DEMO_AUTH_SECRET` of at least 32 characters. Every fictional demo account uses the local-only password `ForgeDemo2026!`.

| Persona | Email |
| --- | --- |
| Beginner player | `beginner@demo.flightforge.app` |
| Recreational player | `recreational@demo.flightforge.app` |
| Advanced player | `advanced@demo.flightforge.app` |
| Course owner | `owner@demo.flightforge.app` |
| Course staff | `staff@demo.flightforge.app` |
| Tournament director | `director@demo.flightforge.app` |
| League administrator | `league@demo.flightforge.app` |
| Platform administrator | `admin@demo.flightforge.app` |

Demo credentials are intentionally public local test fixtures. The hard-coded role demo authenticator refuses to run in production even if `DEMO_AUTH_ENABLED` is set. The separate JPhillips player-only bootstrap flow remains available for the requested server test and forces immediate password replacement.

## Validation

```powershell
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run test:pages
npm test
npm audit
```

Validate the reviewed seed or another JSON/CSV file:

```powershell
npm run seed:validate
npm run seed:validate:statewide
npx tsx scripts/validate-course-import.ts data/import/maine-courses.sample.csv
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Database coverage](docs/DATABASE_COVERAGE.md)
- [Maine course research](docs/MAINE_COURSE_RESEARCH.md)
- [Local setup](docs/SETUP.md)
- [Deployment](docs/DEPLOYMENT.md)
- [API contracts](docs/API.md)
- [Security notes](docs/SECURITY.md)
- [Product assumptions](docs/PRODUCT_ASSUMPTIONS.md)
- [Decision log](docs/DECISIONS.md)
- [Implementation checklist](docs/IMPLEMENTATION_CHECKLIST.md)
- [Launch checklist](docs/LAUNCH_CHECKLIST.md)
- [Release scope and remaining gates](docs/RELEASE_SCOPE.md)

## GitHub Pages publishing

The workflow at `.github/workflows/pages.yml` validates and deploys `pages-dist/` with GitHub Actions. In repository settings, select **GitHub Actions** as the Pages source. The Vite base path is derived from `GITHUB_REPOSITORY`, so project-site asset URLs work without hard-coding a future repository name.

## Honest scope boundary

The Pages edition is a functional product demonstration, not a write-enabled production service. Public identity, cross-device persistence, marketplace payments, private media processing, real provider AI, notification delivery, security operations, and attorney approval require credentials or external review and remain deliberately gated. See [release scope](docs/RELEASE_SCOPE.md) for the exact boundary and next production slice.
