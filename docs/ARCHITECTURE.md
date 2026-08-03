# Architecture

## Current shape

FlightForge begins as a TypeScript modular monolith using the Next.js App Router, React server/client components, Vinext, Cloudflare Workers compatibility, Zod contracts, Drizzle schemas, and domain-focused modules. The application avoids microservices while keeping provider boundaries explicit.

```mermaid
flowchart LR
  Browser[Responsive web client] --> App[Next.js App Router modular monolith]
  Pages[GitHub Pages PWA] --> Local[(Validated device-local state)]
  Pages --> Engines[Pure booking / scoring / bag / caddie engines]
  App --> Auth[Identity + RBAC]
  App --> Courses[Courses + imports]
  App --> Claims[Claims + audit]
  App --> Maps[Map service interface]
  Courses --> D1[(Hosted slice: D1)]
  Claims --> D1
  Claims --> R2[(Private R2 evidence)]
  App -. production adapter .-> PG[(PostgreSQL + PostGIS)]
  PG --> Geo[GiST geographic indexes]
```

## Bounded modules implemented

| Module | Responsibility |
| --- | --- |
| `modules/auth` | Authenticated-user shape, demo session signing, roles, permissions |
| `modules/courses` | Course contracts, source-aware seed data, search, favorites, claims |
| `modules/imports` | Import normalization and duplicate candidates |
| `modules/bookings` | Quote calculation, rule explanation, capacity, expiry, and idempotency |
| `modules/rounds` | Offline snapshots, optimistic versions, score corrections, and summaries |
| `modules/bags` | Disc inventory coverage, overlap, and missing-slot analysis |
| `modules/ai-caddie` | Deterministic, explainable owned-disc recommendations with confidence |
| `modules/media-analysis` | Media metadata, consent, age, size, and processing-readiness gates |
| `packages/database` | PostgreSQL/PostGIS schema, client, migration, seed |
| `packages/maps` | Provider-neutral directions and map-link contract |
| `lib/http` | Consistent non-leaking API errors and request IDs |
| `lib/security` | Origin checks, hashed D1 rate-limit keys, request client identity |
| `db` | Hosted first-slice D1/R2 bindings and schemas |

## Identity

Hosted Sites uses dispatch-owned sign-in and trusted identity headers. Local development can enable signed, HTTP-only demo sessions. Authorization is checked server-side on every write route. Exact hosted emails can be mapped to owner or platform-administrator roles with environment variables.

Demo authentication is not the future public account system. A public deployment outside Sites should integrate an established provider behind the same `AuthenticatedUser` contract.

## Persistence strategy

The production domain model targets PostgreSQL with PostGIS. It currently contains normalized identity, organization, course, source, geographic, favorite, claim, audit, import, and feature-flag tables. `course_locations.coordinates` is a PostGIS point with a GiST index.

The deployed server slice uses platform-backed D1 and private R2 so interactive favorites and claims work without browser storage. This operational adapter is intentionally narrower than the production schema. Wiring all write flows to the PostgreSQL client is still required before a standalone production launch. The GitHub Pages adapter deliberately uses a versioned, Zod-validated browser record; it is isolated from production persistence and visibly labeled throughout the UI.

## Feature modularity

Feature flags are seeded for discovery, claims, booking, scoring, AI, media coaching, and platform fees. Only discovery and claims are enabled in the server slice. The Pages edition demonstrates later flows locally without changing those production flags. Core booking and scoring remain independent from any AI provider.

## Mobile model

Desktop uses top navigation, split results, and management workspaces. Mobile uses a five-item bottom navigation with a central Play affordance, large targets, stacked cards, map/list controls, and thumb-reachable score actions. Pages scorekeeping survives refreshes and browser offline mode; server synchronization is the next production persistence slice.
