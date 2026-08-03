# FlightForge

FlightForge is a responsive disc golf platform beginning with source-attributed Maine course discovery and designed to grow into booking, scoring, events, leagues, a digital bag, and trustworthy AI coaching.

This first implementation cycle delivers a complete discovery-to-course-claim slice rather than a static mockup:

- replaceable global brand configuration;
- hosted identity plus explicitly gated local demo sessions;
- centralized roles and server-side authorization;
- PostgreSQL/PostGIS production schema and migrations;
- durable Sites D1/R2 adapter for the deployed first slice;
- Maine CSV and JSON import contracts with duplicate detection;
- responsive course search and provider-neutral map/list views;
- source-attributed course details and exact unclaimed notices;
- persistent favorites;
- private course-claim evidence upload;
- administrator claim and import review;
- unit, rendered integration, type, lint, and production-build validation.

## Quick start

Prerequisites: Node.js 22.13 or newer. Docker is optional and is used only when exercising the PostgreSQL/PostGIS adapter locally.

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

The application prints its local URL. The built-in local runtime supplies persistent D1 and private R2 emulators for favorites, claims, evidence, and rate limits.

To exercise PostgreSQL/PostGIS as well:

```powershell
docker compose up -d postgres
npm run db:migrate:postgres
npm run seed:postgres
```

Set a strong local-only `POSTGRES_PASSWORD`, update `DATABASE_URL`, and never commit `.env` or `.env.local`.

## Demo sign-in

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

Demo credentials are intentionally public test fixtures. Demo authentication is disabled in production unless explicitly enabled, and should remain disabled on public deployments.

## Validation

```powershell
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm test
npm audit
```

Validate the reviewed seed or another JSON/CSV file:

```powershell
npm run seed:validate
npx tsx scripts/validate-course-import.ts data/import/maine-courses.sample.csv
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Local setup](docs/SETUP.md)
- [Deployment](docs/DEPLOYMENT.md)
- [API contracts](docs/API.md)
- [Security notes](docs/SECURITY.md)
- [Product assumptions](docs/PRODUCT_ASSUMPTIONS.md)
- [Decision log](docs/DECISIONS.md)
- [Implementation checklist](docs/IMPLEMENTATION_CHECKLIST.md)
- [Launch checklist](docs/LAUNCH_CHECKLIST.md)

## Honest scope boundary

Booking, payments, offline scoring, tournaments, leagues, AI caddie, and media coaching are represented in architecture and feature flags but are not presented as live. The recommended next slice is capacity-safe tee-time booking with quote locking, groups, waitlists, notifications, and an owner calendar.
