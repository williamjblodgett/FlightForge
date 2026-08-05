# FlightForge

FlightForge is a responsive disc golf platform beginning with source-attributed Maine course discovery and designed to scale beyond the seed market. The repository contains both a server-backed application slice and a self-contained GitHub Pages edition that makes broader player and operator journeys usable without pretending static hosting is a production backend.

The server-backed application delivers a complete account-to-discovery-to-course-claim slice:

- replaceable global brand configuration;
- original rights-safe hero and social imagery, with illustrative scenes labeled separately from real course records;
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
- coordinator-owned event drafts, audited publication controls, a live public event board, and event detail pages;
- persistent per-user physical disc collections backed by a reviewed, source-attributed, versioned catalog;
- an explainable owned-disc caddie with physical-disc adjustments, calibrated confidence, representative throw feedback, and private learning profiles;
- unit, rendered integration, type, lint, and production-build validation.

The GitHub Pages edition adds working, device-local versions of previously deferred flows:

- capacity-safe booking with explainable, time-limited price quotes and idempotent confirmation;
- public/private playing groups with course, schedule, pace, skill, approval, and join-state controls;
- offline scorekeeping with versioned corrections, per-hole disc/shot/landing/penalty notes, and basic statistics;
- complete digital bag add/edit/remove management, gap/overlap analysis, and an owned-disc-aware caddie;
- fictional tournament registration and league standings;
- owner condition updates, pricing simulation, CSV preview, duplicate detection, and rollback;
- interactive lesson progress, upload-safety validation, editable profile/privacy preferences, explicit demo sign-out, data export, and local deletion;
- an installable PWA shell, responsive collapsible map/list discovery, route-level code splitting, and complete mobile navigation;
- a shared editorial field-atlas interface with photographic hero art and trustworthy topographic course placeholders.

All fabricated booking, event, group, round, and operator records in the static Pages edition are pinned to the fictional Forge Ridge fixture and fail closed if a real course is supplied. All mutable Pages data stays in that browser. The server-backed application now has separate production event, bag, and caddie repositories; the static edition still cannot create real reservations, payments, registrations, course publications, or AI media analyses.

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
npm run catalog:validate
npm run db:validate
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

The Pages edition is a functional product demonstration, not a write-enabled production service. The server-backed Sites deployment supports accounts, profiles/privacy, discovery, favorites, claims, event publishing, physical bags, and the deterministic caddie. Shared booking/scoring, marketplace payments, private media processing, external-provider AI, notification delivery, independent security operations, and attorney approval require further code or external evidence and remain deliberately gated. See [release scope](docs/RELEASE_SCOPE.md) for the exact boundary and next production slice.
