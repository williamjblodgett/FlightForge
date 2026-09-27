# September 27 cross-site release review

## Scope and architecture

This release finishes the unshipped September 19 review and adds a mobile/reliability pass. The existing Vinext/React modular application, Cloudflare Worker, D1 database, private R2 media storage and account providers are preserved. No database migration or provider cutover is introduced here. GitHub Pages remains a separate static demonstration; the full application is the existing FlightForge Sites project.

## Changes

- **Discovery:** filters remain open when changed; search text and map bounds follow clear/back navigation. Mobile course artwork is shorter, metadata wraps, and no course information is removed.
- **Navigation:** More groups all sixteen tools into play, practice and community sections, with account/privacy/sign-out above them. New tool routes retain an active mobile tab. The profile menu scrolls within the viewport, and secondary links no longer automatically prefetch every destination.
- **Messaging:** guest access redirects to sign-in with its destination intact. Moving the loading boundary inside the authenticated page avoids the Vinext streamed-redirect rendering failure.
- **Bag:** controls wait for hydration; successful writes update the visible collection before a best-effort refresh. Saved-disc and saved-feedback messages distinguish refresh failures. Removal errors stay inside the active confirmation dialog.
- **Passport, groups and leagues:** explicit loading, successful-empty and failure states; read-only retry; setup/sign-in gates; cancellation and latest-request protection; expired-session invalidation. Mutations remain server-authorized. Acknowledged writes are not misreported as failed when refresh fails. League creation resets its idempotency key only after acknowledgement.
- **Scorekeeping:** variable-height save/retry notices move below the active score controls. Browser traces showed that removing the retry toolbar above the card during a tap could lose a penalty-button click. Scoring remains usable while synchronization is pending.
- **Round entry:** visiting Start a round without a course now offers course discovery or continuing a saved round instead of a 404.
- **Course data:** nine primary-source-supported listings researched September 19 are included, bringing the catalog to 186: ME 120, NH 14, VT 14, MA 15, CT 18, RI 5. Their review dates are not silently advanced to this release date. See `research/course-refresh-2026-09-19.md` for provenance and access restrictions.

## Validation

- Strict TypeScript and ESLint: passed.
- Unit tests: 180 passed across 50 files.
- Isolated rendered/API integration tests: 11 passed.
- Full browser suite: 65 passed, one existing skipped cold-offline WebKit/iPhone test. An additional three-browser targeted check passed after the final missing-course fix. Chromium desktop, mobile Chromium and mobile WebKit are exercised; this is not physical-device certification.
- Read-only public sweep: 174 route/viewport combinations at 1440, 390 and 320 pixels. The 171 expected-success cases passed; three direct `/rounds/new` requests exposed the missing-course 404, corrected in this release. No page-render errors, broken assets, horizontal overflow or clipped controls were detected. Desktop and phone More screenshots were visually reviewed.
- Static Pages build checks: 3 passed.
- Migration validation: 19 D1 migrations, 156 tables.
- Regional import validation: 66 primary-source regional records, no duplicate slugs/external identifiers or invalid facility groups.
- Production Worker build: passed. The build still warns about a client chunk above 500 kB; further feature-level splitting remains worthwhile.
- Dependency advisory check: zero known advisories on September 27. This does not constitute a penetration test.

Browser accounts, requests and storage were isolated from production. Test-only IP separation avoids unrelated simulated accounts sharing a single localhost rate-limit bucket; production rate limits were not changed. No production player records were created or deleted for this review.

## Remaining work and recommended next slice

1. Rehearse cold offline launch on a physical iPhone, then complete the currently skipped automated coverage where supported.
2. Reduce the shared client bundle through measured route/feature splitting; extend the new recovery pattern to practice, recovery and course-update screens.
3. Continue primary-source review of the 288 withheld regional candidates and 104 Maine entries lacking a primary-source override. Availability is not a same-day opening guarantee; course-specific restrictions remain visible.
4. Complete the controlled Supabase database migration, parity/backup/restore rehearsal and application cutover. The regenerated 186-record seed has not been applied in this release; live application persistence remains D1.
5. Complete remaining provider/operational gates: verified delivery and recovery, marketplace payments, isolated media sanitation/scanning, global retention scheduling, independent security testing and legal review. None is represented as activated by this UI release.

## Release procedure

Publish the exact checked source to GitHub main and the existing Sites source repository. Save its matching Worker archive and confirm the native Sites deployment reaches `succeeded`; a successful Pages workflow alone is not production application publication. Native version/deployment records identify the final release. No secrets are included in source or this report.
