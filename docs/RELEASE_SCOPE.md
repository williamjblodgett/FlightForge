# Release scope and remaining gates

## What is implemented

The server-backed slice provides free password signup/login, salted PBKDF2 credentials, revocable hashed sessions, visible provider-aware sign-out, forced replacement of the JPhillips temporary password, first-run profile/privacy setup, hosted identity integration, RBAC, 120 source-attributed Maine listings, course details, favorites, claims, administrator review, and D1/R2 persistence.

Three formerly demonstration-only product areas are now production-backed. Authorized course owners, tournament directors, league administrators, and platform administrators can create private event drafts, publish them to the public event board, edit, unpublish, and cancel them with ownership checks, optimistic versions, rate limits, idempotent creation, and immutable actor-aware audit records. Signed-in users can persist individual physical discs, including catalog match, weight, wear, plastic, run, condition, status, and notes. The caddie uses active owned discs, sourced versioned baseline ratings, physical-disc inputs, representative throw observations, calibrated confidence, alternatives, and explicit missing information. These modules have database migrations, runtime feature controls, validation, authorization, error/empty/loading states, responsive interfaces, and tests.

The authenticated Camera Coach beta supports guided browser-camera capture, MP4/MOV/WebM uploads, explicit adult or guardian consent, signature and size validation, private R2 storage, D1 metadata and guidance records, user-selected expiration, deletion, a versioned source-attributed practice guide, and a GPS rangefinder that displays source accuracy. It explicitly states that current guidance is rules-based and does not claim computer vision measured the clip. Satellite imagery opens through Google Maps for orientation; it is not treated as measurement truth or ingested into FlightForge.

The GitHub Pages edition extends the product into an interactive, installable demonstration. Search, favorites, current-location sorting, collapsible map/list discovery, capacity-safe booking, quote explanations, waitlist previews, configurable social groups, offline scoring with per-hole context, basic statistics, complete digital-bag CRUD, bag intelligence, deterministic caddie recommendations, fictional events and leagues, role-separated operator/admin simulations, pricing simulation, CSV import preview/rollback, interactive learning progress, media-safety validation, editable profile/privacy controls, export, and deletion work in-browser.

Device-local data is schema validated, versioned, and migrated. Fabricated bookings, groups, rounds, events, claims fixtures, and owner metrics are isolated to a stable fictional course record; passing a real course into those workflows fails closed. The state is not sent to FlightForge, does not affect a real course, and can be exported or erased by the user. The Pages demo has an explicit device-session sign-out state; signing out does not silently erase saved browser data.

## Why some boundaries remain

The following are launch gates rather than coding placeholders:

| Gate | Why it cannot be represented as live on GitHub Pages | Required completion evidence |
| --- | --- | --- |
| Email ownership and account recovery | Password accounts work, but email verification, password reset, MFA/passkeys, and transactional delivery are not configured | Delivery provider, token lifecycle tests, abuse controls, recovery runbook |
| Payments and payouts | Marketplace identity, tax, disputes, and webhook secrets require a secured backend | Provider sandbox, ledger reconciliation, idempotent webhook tests, launch approval |
| Booking inventory and notifications | Shared tee-time capacity and delivery still need transactional repositories and providers | Database transaction tests, queue, email/push credentials, retry and audit evidence |
| Automated photo/video coaching | Guided capture, consent, private storage, signature checks, expiration, and deletion are active; malware scanning, isolated transcoding, landmark extraction, and an approved multimodal model still require providers and evaluation | Scanner/transcoder tests, coach benchmark, provider evaluation, scheduled global deletion verification |
| Legal approval | Templates cannot establish compliance or allocate liability | Attorney approval for the jurisdictions and features actually launched |
| Security operations | A source-code claim cannot replace independent verification or an incident team | Penetration test, monitoring, alerting, backups, rotation, incident runbook |

The interface labels these gates as **provider required** or **external review**. It does not show fake success states for payment, message delivery, cloud synchronization, or media analysis.

## Recommended next production slice

Activate booking and scoring repositories on the existing schema, then add authenticated APIs and transaction-level integration tests for shared tee-time inventory, waitlists, group membership, offline synchronization, owner calendars, and notifications. Keep payments disabled until this foundation passes staging load, security, and reconciliation checks.
