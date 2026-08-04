# Release scope and remaining gates

## What is implemented

The server-backed slice provides free password signup/login, salted PBKDF2 credentials, revocable hashed sessions, visible provider-aware sign-out, forced replacement of the JPhillips temporary password, first-run profile/privacy setup, hosted identity integration, RBAC, 120 source-attributed Maine listings, course details, favorites, claims, administrator review, D1/R2 persistence, and domain-complete D1 schema foundations.

The GitHub Pages edition extends the product into an interactive, installable demonstration. Search, favorites, current-location sorting, collapsible map/list discovery, capacity-safe booking, quote explanations, waitlist previews, configurable social groups, offline scoring with per-hole context, basic statistics, complete digital-bag CRUD, bag intelligence, deterministic caddie recommendations, fictional events and leagues, role-separated operator/admin simulations, pricing simulation, CSV import preview/rollback, interactive learning progress, media-safety validation, editable profile/privacy controls, export, and deletion work in-browser.

Device-local data is schema validated, versioned, and migrated. Fabricated bookings, groups, rounds, events, claims fixtures, and owner metrics are isolated to a stable fictional course record; passing a real course into those workflows fails closed. The state is not sent to FlightForge, does not affect a real course, and can be exported or erased by the user. The Pages demo has an explicit device-session sign-out state; signing out does not silently erase saved browser data.

## Why some boundaries remain

The following are launch gates rather than coding placeholders:

| Gate | Why it cannot be represented as live on GitHub Pages | Required completion evidence |
| --- | --- | --- |
| Email ownership and account recovery | Password accounts work, but email verification, password reset, MFA/passkeys, and transactional delivery are not configured | Delivery provider, token lifecycle tests, abuse controls, recovery runbook |
| Payments and payouts | Marketplace identity, tax, disputes, and webhook secrets require a secured backend | Provider sandbox, ledger reconciliation, idempotent webhook tests, launch approval |
| Shared inventory and notifications | Real capacity needs transactional writes and delivery providers | Database transaction tests, queue, email/push credentials, retry and audit evidence |
| Photo/video coaching | Identifiable media needs private storage, scanning, transcoding, consent, retention, and an approved model | Security pipeline tests, consent records, provider evaluation, deletion verification |
| Legal approval | Templates cannot establish compliance or allocate liability | Attorney approval for the jurisdictions and features actually launched |
| Security operations | A source-code claim cannot replace independent verification or an incident team | Penetration test, monitoring, alerting, backups, rotation, incident runbook |

The interface labels these gates as **provider required** or **external review**. It does not show fake success states for payment, message delivery, cloud synchronization, or media analysis.

## Recommended next production slice

Activate booking and scoring repositories on the new schema, then add authenticated APIs and transaction-level integration tests for shared inventory, waitlists, group membership, offline synchronization, owner calendars, and notifications. Keep payments disabled until this foundation passes staging load, security, and reconciliation checks.
