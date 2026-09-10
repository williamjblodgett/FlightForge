# Connected player tools — September 10, 2026

## Scope

This release adds eight connected player tools to the server-backed Sites application. GitHub Pages remains a separate device-local demonstration; it does not operate the production database.

| Tool | Entry point | Implemented behavior |
| --- | --- | --- |
| Course updates | Course page, `/updates` | Expiring player/operator reports, scoped operator attribution, follows, in-app feed and retraction |
| Shared play | `/groups`, Play | Public/private groups, revocable link/QR invites, adult participation, host approval, guest scores, capacity checks and member scoreboards |
| Practice calibration | Fieldwork, Bag, `/practice` | Owned-disc measurement history, uncertainty filtering, explicit consent and reversible distance calibration |
| Round recap | `/rounds/[id]` | Aces, penalties, expensive holes, one general practice drill and comparable earlier-round personal bests |
| Disc recovery | Bag, `/recover` | Hash-only, revocable contact tags, optional lost-disc board, private messages, block/close/delete controls |
| League companion | `/leagues` | Authorized recurring event schedules, time-zone-aware weekly dates, RSVP/waitlist promotion, private attendance roster and calendar export |
| Offline guides | Course page, `/downloads`, `/offline` | Explicit course facts, optional private bag/active round, offline scoring, export, versioned synchronization and conflict recovery |
| Passport and planner | `/passport`, `/plan` | Private manual/app-recorded course stamps, wishlist, six-state view and saved editable two-day itineraries |

The existing five-tab mobile navigation is retained. Additional tools are in More and relevant course, Bag and Play screens. JavaScript-driven controls stay disabled until hydrated, preventing ignored first taps and native form submissions before handlers attach.

## Data and architecture

The existing TypeScript modular monolith remains on Sites D1/R2. Additive migrations 0015–0018 introduce practice measurements with versioned consent/tombstones; passport entries; itineraries; recovery tags/cases/messages; play groups/members; league RSVP records; event-series linkage; transaction guards; and player-tool audit records. The complete D1 migration chain has 19 migrations and 156 tables. Existing condition, follow, league, event and round tables are reused.

Registered group members retain their own private scorecards. A group membership permits only a limited shared score projection. Guest scores belong to the group; they do not become verified player statistics. Group closure ends participation, not personal-round editing or retention.

The new API families are `/api/course-updates`, `/api/groups`, `/api/practice`, `/api/recovery`, `/api/leagues`, `/api/passport`, `/api/itinerary` and `/api/offline-pack`. Mutations enforce server-side identity, origin checks, bounded input validation, ownership/scope and rate limits. Conditional SQL and transactional guards protect seat counts, invitation revocation, event linkage and score versions. Private responses are no-store; errors do not expose database internals.

New feature flags: `course_updates`, `shared_play`, `practice_history`, `disc_recovery`, `league_companion`, `course_passport`, `weekend_planner`, `offline_guides`. Monetization remains disabled. No new API keys are required; QR codes are generated locally.

## Offline and privacy boundaries

The service worker caches an exact public static-shell allowlist, never authenticated page HTML or API responses. A version handshake confirms an activated worker and a complete shell before marking a pack ready. Private packs require explicit device-storage consent and live in IndexedDB, not CacheStorage. Device-local storage is not encrypted and should not be used on a shared browser.

Atomic generation/revision checks prevent stale tabs from replacing newer scores. Sign-out scrubs synchronized private data and locks unsynchronized packs without discarding pending scores. Cross-tab invalidation and page-visibility checks clear stale views. Unlocking requires the same signed-in player. If browser storage fails, the interface permits server sign-out and explains that device cleanup could not be confirmed.

Practice sends distance and uncertainty, not precise throw coordinates. At least three eligible owned-disc samples are required for distance calibration. Consent can be revoked; deleted samples remain tombstoned to prevent retry resurrection. QR tokens are hash-only in the database and use URL fragments rather than server query logs. Recovery identity/contact details are not exposed to the other player. Privacy cleanup remains available after social participation is restricted.

## Validation

Local release validation: strict TypeScript and lint passed; 173 unit tests across 49 files passed; 11 rendered/server integration tests passed; 3 Pages artifact tests passed; 41 desktop/mobile browser checks passed and one Windows WebKit cold-start check remains explicitly pending. The 19-migration D1 rehearsal passed with 156 tables. The production build passed, and npm audit reported zero known vulnerabilities. The Sites Windows build wrapper could not find its npm shim, so the same project build was run directly with `npm run build`. Mobile passport screenshots were visually reviewed. These checks are not an independent penetration test or physical-device certification. Tests use isolated migrated databases, test email and mock providers, not production credentials or customer data. The browser harness uses a one-day localhost certificate; its Chromium certificate bypass is restricted to the isolated test launch and does not weaken production TLS or cookies.

## Local setup

Use Node.js 22.13 or newer and the existing README setup. Run `npm ci`, then `npm run review:preview` for an isolated local database and mock-provider preview. Install browser engines with `npx playwright install chromium webkit`; OpenSSL is required for the HTTPS test harness. Run `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:server`, `npm run test:pages`, `npm run test:e2e`, `npm run db:validate` and `npm run build`.

No new production secrets or environments are necessary for these eight tools. The existing verified-email account, D1 database, R2 binding and legal/contact configuration remain prerequisites. Do not copy production secrets into tests. New database migrations must be applied before exposing the release; health checks include the added schema.

## Account privacy request inventory

Account-wide export/erasure is still a reviewed support workflow, not an automated endpoint. The new tables do not cascade on user deletion. A privacy request must cover `practice_measurements` (including tombstones), `passport_entries`, `player_itineraries`, condition authors and follows, group ownership/members/names/guest scores, recovery tags/cases/messages for either participant, league administration/memberships/RSVP/attendance and linked event contacts, and `player_tool_audit` identifiers/details. Existing round records also remain in scope. Exports must exclude token hashes and other participants’ private information. Transfer or close shared groups/leagues and anonymize appropriate identifiers without deleting other players’ personal scorecards. Apply an approved retention policy to audit and transactional records. Revoke sessions and process each device’s offline downloads separately; forced sign-out intentionally preserves unsynced drafts and is not erasure. Per-feature remove/retract/revoke controls do not replace this account-wide process.

## Explicit limitations

- Reports are time-limited observations, not a guarantee that a course is open. There is no new live weather, traffic, sunset or operator-hours integration.
- Updates, league changes and disc recovery use in-app views. Email/push notifications are not added by this release. Group boards poll every 15 seconds while visible.
- Group invitations and league RSVPs are not tee-time bookings, paid tournament registrations, waivers or Stripe transactions. Calendar files are snapshots, not live subscriptions; reminders depend on the user's calendar app.
- Calibration estimates distance only. It does not measure release mechanics, disc stability, velocity or spin. Round recaps provide deterministic general suggestions, not technique diagnosis.
- iPhone/Safari cold offline reopening is not validated. The local Windows WebKit driver fails navigation after going offline despite an active controller and complete cache; this cold-start test is explicitly marked pending, not passed. Downloading, in-page offline score entry, stale-tab protection, sync and sign-out are separately tested in WebKit. Keep the guide open before losing signal until physical-iOS validation is complete.
- Offline guides require a successful download and browser storage support. No satellite imagery or licensed map tiles are downloaded. GPS facts are approximate. Finishing a round requires reconnection.
- Passport visits and scores are self-entered/app-recorded, not independently verified or sanctioned. Planner travel, round durations and daylight cutoffs are user assumptions.
- Account-wide automated export/erasure remains unimplemented; use the privacy-request workflow and inventory above.
- This release does not perform the D1-to-Supabase production cutover, configure payments, prove real-provider voice/email delivery, validate physical sensors, establish malware/transcoding services, or complete backup/restore, independent penetration testing and legal approval. Those launch gates remain separate work.

The owned-disc calibration limitation in the earlier mobile release note is superseded by the explicit practice-history flow here; other provider-dependent limits remain in force.
