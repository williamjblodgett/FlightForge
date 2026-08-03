# Release scope and remaining gates

## What is implemented

The server-backed slice provides hosted identity integration, gated demo sessions, RBAC, source-attributed Maine discovery, course detail pages, persistent favorites, private claim evidence, immutable claim review, administrator import review, D1/R2 persistence, and a PostgreSQL/PostGIS production model for those domains.

The GitHub Pages edition extends the product into an interactive, installable demonstration. Search, favorites, current-location sorting, map/list discovery, capacity-safe booking, quote explanations, waitlist previews, social groups, offline scoring, basic statistics, digital bags, bag intelligence, deterministic caddie recommendations, fictional events and leagues, operator conditions, pricing simulation, CSV import preview/rollback, structured learning, media-safety validation, privacy controls, export, and deletion work in-browser.

Device-local data is schema validated and versioned. It is not sent to FlightForge, does not affect a real course, and can be exported or erased by the user.

## Why some boundaries remain

The following are launch gates rather than coding placeholders:

| Gate | Why it cannot be represented as live on GitHub Pages | Required completion evidence |
| --- | --- | --- |
| Public identity and cross-device sync | Static hosting has no trusted server session or private database | Chosen provider, threat model, session tests, PostgreSQL adapter |
| Payments and payouts | Marketplace identity, tax, disputes, and webhook secrets require a secured backend | Provider sandbox, ledger reconciliation, idempotent webhook tests, launch approval |
| Shared inventory and notifications | Real capacity needs transactional writes and delivery providers | Database transaction tests, queue, email/push credentials, retry and audit evidence |
| Photo/video coaching | Identifiable media needs private storage, scanning, transcoding, consent, retention, and an approved model | Security pipeline tests, consent records, provider evaluation, deletion verification |
| Legal approval | Templates cannot establish compliance or allocate liability | Attorney approval for the jurisdictions and features actually launched |
| Security operations | A source-code claim cannot replace independent verification or an incident team | Penetration test, monitoring, alerting, backups, rotation, incident runbook |

The interface labels these gates as **provider required** or **external review**. It does not show fake success states for payment, message delivery, cloud synchronization, or media analysis.

## Recommended next production slice

Persist the already-tested booking and scoring engines in PostgreSQL, then add authenticated APIs and transaction-level integration tests for shared inventory, waitlists, group membership, offline synchronization, owner calendars, and notifications. Keep payments disabled until this foundation passes staging load, security, and reconciliation checks.
