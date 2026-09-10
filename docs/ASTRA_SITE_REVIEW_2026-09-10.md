# FlightForge: live-site test and Astra improvement plan

Reviewed September 10, 2026. Two independent GPT-6 Astra reviewers examined the application code; the primary agent tested the live browser experience and ran the existing automated checks. Astra also synthesized the implementation order below.

## Scope and bottom line

Live application: https://flightforge-maine-launch.williamjblodgett.chatgpt.site

Sites reports a public, active application, latest version 29, updated August 25. Local source is commit `a2a8fc06cb098e97d8ddec2a4ee03ff94b7a1bc3`. This review did not modify application code, publish a release, create live accounts, submit claims, upload media, enter scores, or send messages. The separate GitHub Pages demo is not the production server application.

The next release should complete one dependable journey:

**Find a course → start/resume a round → score safely → get contextual help → finish → reopen results.**

The current site has useful foundations, but passing automated tests does not establish that this journey works. Mobile toolbar obstruction and lost navigation context were reproduced. The code review also found scoring correctness and persistence risks that deserve attention before new AI features or a full visual redesign.

## What was tested

| Area | Current result | Qualification |
| --- | --- | --- |
| Live home and course discovery | Rendered and navigated successfully; 177 listings displayed | Guest browser; not a new accuracy audit of 177 courses |
| Course search | Bellamy search returned the matching course and updated `q`/`view` in the URL | A short intermediate state shows page-local results while the directory updates |
| Map drawer | Open/close button and marker selection work | No selected-course action; Escape failed to dismiss |
| Course detail and claiming | Bellamy detail loaded; guest claim page required sign-in and preserved its claim destination | Did not submit or approve a live claim |
| Authentication entry | FlightForge email/password form and free signup form visible; no ChatGPT login required | Did not create an account or test real email delivery |
| Bag and Coach guest gates | Redirected to sign-in with `/bag` and `/coach` respectively | End-to-end signed-in continuation remains untested live |
| Play entry | Fieldwork, event, course finder, and clearly labeled fictional scoring demo reachable | No direct personal round from a real course |
| Demo scorecard | Hole navigation and score/penalty controls present | No new scores entered; offline/reconnect mutation journey not exercised live |
| Video dialog | Per-hole Add Video opened the guest dialog; Escape closed it and restored focus to its trigger | No upload, camera permission, or authenticated media access test |
| Fieldwork | Loaded; landing capture disabled before start; privacy and GPS uncertainty explained | No precise location shared; no field measurement performed |
| Events | Board rendered with an honest no-public-events empty state | No live event available to test participant journey |
| Responsive checks | Primary mobile review at 390×844; Fieldwork at 320×740; desktop discovery at 1440×900 | Chrome viewport testing, not physical iPhone/Safari testing |

At the measured widths, no horizontal page overflow was found on home, Fieldwork, or the sampled course detail. Fieldwork's narrow-screen buttons did not show internal horizontal clipping. This is a sampled result, not a claim that every button or route is clean.

### Automated results, rerun during this review

| Check | Result |
| --- | --- |
| TypeScript typecheck | Passed |
| ESLint | Passed |
| Unit tests | 138 passed across 43 test files |
| Rendered/server integration tests | 11 passed |
| GitHub Pages artifact tests | 3 passed |
| Production server build | Passed |
| Separate Pages demo build | Passed |
| D1 migration validation | 13 migrations applied in validation; 143 tables available |

Total: **152 passing automated tests**. Server integration tests use local test accounts and test email mode; they do not verify production Supabase email, real AI, payments, or production database cutover. The local runtime logged a non-fatal inability to fetch Cloudflare request metadata and used a fallback. Existing Playwright E2E tests were inspected but not rerun; browser interactions above were performed through the connected live browser.

A recent error-only production-log query returned a `/favicon.ico` 404, with no application exception in that returned sample. Browser console inspection during the scorecard issue returned no warnings/errors. Neither observation is a comprehensive monitoring or security assessment.

## Reproduced live issues

### L1. Scrolled round toolbar is covered by the global header — urgent

Reproduction: Play → fictional field demo → choose hole 12 in the scorecard grid → use the sticky Share Video toolbar control while scrolled.

The button occupies approximately y=14–58 px, but the element receiving a pointer at its center is `.header-inner`. The action did not open a dialog. The lower per-hole Add Video button worked. This is a functional overlap, not merely visual styling.

Fix: establish a dedicated active-round layout with one top toolbar, or correct shared header offsets and stacking. Test the actual pointer target, not just whether a toolbar element exists.

### L2. Current hole is lost on refresh — high

Choosing hole 12 and reloading returned the interface to hole 1. Preserve the active hole together with the round state and restore it after navigation to assistance. This test did not establish loss of entered scores; no scores were entered.

### L3. Map selection stops short of a usable destination — high

Explore → Map → select Bellamy changed the marker's selected state but exposed no preview card or Open Course action. Escape did not close the fullscreen map. The visible Close Map button did work.

Fix: selected-course bottom sheet with name, town, essential facts, and Open Course; appropriate modal focus handling, Escape, and focus return. Keep keyboard-accessible list alternatives.

### L4. Favoriting drops search context at login — high

After searching Bellamy at `/courses?q=Bellamy&view=list`, the favorite button redirected to `/sign-in?return_to=%2Fcourses`. Query and view were lost before login began.

Fix: preserve the complete safe relative destination and an explicit, idempotent save intent through login, verification, and onboarding.

### L5. Essential mobile actions are buried — high usability priority

Approximate document coordinates at 390×844:

| Page | Observation |
| --- | --- |
| Home | 9,273 px page height; search near y=1,173 |
| Fieldwork | Use My Location at y=1,174; Mark Start at y=1,548; Mark Landing at y=1,680 |
| Bellamy course | Save Course at y=772; Directions at y=3,375 |
| Sign-in | Hero and introductory card content push submission below the initial viewport |

The first screen often introduces a tool instead of letting the player use it. Keep safety guidance, but present it concisely near the relevant control; do not remove practice-permission or GPS limitations.

### L6. Real course → casual scorecard is missing — high

Play offers course discovery, event scoring, and a fictional demo. The real course page has no Start Round action. A player should not need an event to keep a personal score.

### L7. Course contact actions can lead to a research document — medium

Bellamy's prominent Check With the Course action points to a city recreation-plan PDF. Preserve that document as a source, but distinguish supporting documentation from a usable operator contact, current park page, or booking destination.

## Additional code-confirmed findings

These are source findings, not live production failure reproductions.

| ID | Finding and risk | Evidence |
| --- | --- | --- |
| C1 | Every event uses one hard-coded par sequence. Relative scoring is not based on that event's actual layout. | `components/rounds/LiveRoundScorecard.tsx:65`, `:78`; `app/play/page.tsx:52` |
| C2 | Signing in changes offline ownership from guest to user ID, without an explicit guest-round import. The advertised save handoff can leave the guest draft behind. | `app/play/page.tsx:52`; `modules/rounds/offline-store.ts:32`; `LiveRoundScorecard.tsx:211`, `:385` |
| C3 | IndexedDB and localStorage write failures can both be swallowed while the UI claims the round is saved on this device. | `modules/rounds/offline-store.ts:51`, `:208`; `LiveRoundScorecard.tsx:258`, `:408` |
| C4 | Completed-result presentation is transient component state; no completed-round history surface is implemented. This does not mean all server score records are erased. | `LiveRoundScorecard.tsx:97`, `:323`, `:335`; `modules/rounds/round-repository.ts:128`, `:140`; `app/profile/page.tsx:25` |
| C5 | Caddie link has no round/hole context; Coach does not consume the passed return destination. | `LiveRoundScorecard.tsx:352`, `:354`; `app/coach/page.tsx:13` |
| C6 | Map receives only the current 24-course list page; bounds filtering operates on that subset while totals/pagination can represent the larger catalog. Clusters use fixed cells and cannot expose all members. | `app/courses/page.tsx:33`; `modules/courses/components/CourseExplorer.tsx:95`, `:100`, `:322`; `CourseMap.tsx:19`, `:50`, `:61` |
| C7 | Onboarding returns `/profile` unconditionally. High page numbers are not upper-clamped; disabled pagination links remain links. | `app/api/account/onboarding/route.ts:46`; `app/courses/page.tsx:33`; `CourseExplorer.tsx:315`; `app/globals.css:3669` |
| C8 | Legacy signup can commit a pending account before email delivery fails, with no implemented resend/retry workflow. Verification UI has no complete network-error recovery. Production use of this legacy branch was not established. | `app/api/auth/signup/route.ts:109`; `modules/auth/account-repository.ts:284`; `modules/notifications/email-verification.ts:29`; `app/verify-email/VerifyEmailForm.tsx:10` |
| C9 | Signup UI readiness and backend delivery readiness are different predicates. An enabled form does not prove provider readiness. | `config/public-launch.ts:14`; `app/sign-up/page.tsx:14`; `app/api/auth/signup/route.ts:29`, `:89` |
| C10 | Coach upload/delete lacks complete catch/finally and submission-state handling. Network rejection can strand controls or encourage duplicate submissions. | `components/coach/CameraCoachWorkspace.tsx:74`, `:106` |
| C11 | Fieldwork Mark Again appends another measurement rather than correcting one throw; only the most recent 20 summaries are retained. | `app/fieldwork/FieldworkWorkspace.tsx:201`, `:355`; `modules/fieldwork/measurement.ts:11`, `:134` |
| C12 | Fieldwork measurements do not include disc, throw type, or practice session, leaving Bag/Coach distance entry disconnected. | `modules/fieldwork/types.ts:13`; `components/bags/BagWorkspace.tsx:65`; `CameraCoachWorkspace.tsx:130` |
| C13 | Header, bottom navigation, and some pages independently resolve the current user without request-scoped memoization. Unread polling fetches the complete community dashboard. Actual added latency remains unmeasured. | `components/shell/SiteHeader.tsx:22`; `MobileNav.tsx:6`; `modules/auth/current-user.ts:16`; `components/community/UnreadMessagesLink.tsx:15`; `modules/community/community-repository.ts:78` |
| C14 | Home passes the whole catalog to the client explorer. Several browser tests assert appearance/source strings rather than completing the journeys above. | `app/page.tsx:25`; `tests/e2e/flightforge.spec.ts:3`, `:41`, `:102`; `modules/auth/standalone-account-entry.test.ts:17` |

Search back/forward synchronization is an additional hypothesis to test; it was not reproduced in this review. Do not treat it as a confirmed defect yet.

## Astra's ordered implementation plan

### Slice 1 — Reliable active-round controls and local saving

Owner: rounds + shared layout. Dependencies: none. Small-to-medium scope.

- Fix L1 and L2; persist current hole and provide explicit return-to-round behavior.
- Address C3: distinguish durable local save, pending server sync, and memory-only state. Provide export/retry and an unsaved-navigation warning when necessary.
- Preserve the already-working video dialog Escape/focus restoration behavior.
- Add failing-before/passing-after tests for toolbar pointer obstruction, refresh on hole 12, storage denial, quota exhaustion, and refresh with an offline saved draft.

Done: every toolbar action is reachable after scrolling at 320/390 px; durable drafts survive refresh; storage failure never receives a false saved confirmation. Release this focused fix independently once validated.

### Slice 2 — Correct round data and safe guest handoff

Owner: rounds + course layouts + authentication. Medium scope; follows slice 1.

- Snapshot hole IDs, pars, layout version, and provenance when creating a round. For unknown data use clearly labeled player-entered pars or strokes-only mode, not an invented official layout.
- Offer explicit import of this device's guest round after sign-in. Keep the original until successful synchronization; do not silently adopt another person's draft when accounts change.
- Validate idempotent sync/completion and conflict resolution across two devices.

Done: two different layouts yield their correct totals; guest scoring survives sign-in; retries never duplicate or silently discard a score; account isolation holds. Statistics and caddie context must build on this corrected model.

### Slice 3 — Complete personal rounds and persistent results

Owner: rounds + courses + player history. Medium-to-large scope; depends on slice 2.

- Add course → layout → personal round creation without an event requirement.
- Add persistent result URLs and a History screen, with hole scores and permission-checked correction history.
- Pass verified round/hole/bag context into the caddie. Keep help in a panel or provide an explicit Return to Hole action. Do not invent distances when no hole data exists.
- Separate personal, event, and fictional-demo labels and authorization.

Done: a user selects a real course, plays a personal round, visits help, returns to the same hole, completes, refreshes, and reopens identical results from History. Test private history access with a second account.

### Slice 4 — Compact mobile navigation and truthful discovery

Owner: design system + shell + courses. Medium-to-large scope; can start shared primitives alongside slice 3.

- Keep the forest/navy/orange identity, logo, and outdoor character. Reserve large editorial headings and artwork for marketing, not every utility page.
- Introduce shared public-page, player-app, and active-round layouts. Use one dominant action per screen and consistent spacing, controls, status text, and loading states.
- Keep five tabs: Home, Explore, Play, Events, More. More contains Bag, Caddie, Coach, Fieldwork, History, Community, and Messages; Account & Privacy is a separate subsection. Retain role-scoped management tools here when authorized. Validate the More label with users before making it permanent.
- Home prioritizes Resume/Start, nearby course search, and recent activity. Play prioritizes Resume, Course Round, Event, and Fieldwork. Events shows the calendar before organizer promotion. Make login form-first on mobile.
- Explore opens a compact list, with filter chips and a full-screen map drawer. Use full-query map summaries independent of list pagination, useful cluster expansion/member selection, and a selected-course sheet.
- Course detail puts Directions and Start Round first; show booking only when genuinely supported. Move detailed sourcing into an expandable section while retaining meaningful uncertainty labels.
- Preserve query/view/page through login and onboarding. Clamp page boundaries and use truly disabled controls. Test browser back/forward.
- Use licensed operator imagery when available; do not replace factual course images with invented scenery. Unavailable Leagues/Learn remain clearly labeled future features.

Done: a primary action is visible in the first viewport at 390×844; player tools are reachable within two taps; map → course → favorite → login return is complete; a course outside the first 24 list records is still findable by map area. No clipping, obstructed controls, or misleading result counts.

### Slice 5 — Useful, recoverable practice tools

Owner: Fieldwork + Bag + Coach. Medium scope; uses slice 4 primitives.

- Fieldwork opens directly on Measure / Find Space tabs, with start/landing controls and short contextual safety guidance.
- Separate draft capture, correction, and Save Throw. Explain local-history limits; add optional disc, throw type, and session tags.
- Reuse a saved measurement in bag feedback/coaching only through an explicit player action. Retain GPS uncertainty; do not silently change calibration.
- Add complete upload/delete busy, cancellation, retry, and failure states; preserve media and form inputs on network failure.
- Keep actual provider/analysis capabilities explicit. A course listing is not proof that unrestricted field practice is permitted. A verified practice-space dataset is separate work.

Done: three landing recaptures still represent one throw; interrupted upload/delete recovers without duplication; a saved distance can be deliberately reused without retyping. Real-device GPS/camera tests are required before claiming field accuracy.

### Slice 6 — Account recovery, performance, and release verification

Owner: auth + platform + QA. Medium scope; recovery/performance work may run in parallel with slices 3–5.

- Add verification resend, durable delivery retries, expired-link recovery, and shared signup readiness checks. Prove production signup, verification, password recovery, sign-out, and onboarding with a dedicated test account.
- Resolve identity once per server request; use lightweight unread counts and a shared community cache. Avoid full-catalog home payloads and defer maps/media tools until needed.
- Establish measured route payload and latency baselines. Track release ID, client exceptions, failed mutations, and failed sync without logging private inputs. Fix the favicon 404.
- Add behavioral E2E coverage for every reported defect, WebKit/Safari coverage, accessibility checks, network-failure tests, and screenshot regression tests.
- Validate owner/coordinator permissions, claims approval, private messaging, blocking, video sanitization/deletion, and admin workflows in staging with purpose-created accounts.
- Verify actual live deployment health and rollback readiness separately from the static Pages demo. Do not infer Supabase production readiness from successful D1 migration tests.

Done: real verification/recovery delivery works; complete journeys and failure tests pass; measured performance shows no regression; production smoke tests and rollback checks are documented.

## Definition of done for the next mobile release

- Widths 320, 375, 390, 430, 768, and desktop; portrait/landscape, 200% text enlargement, software keyboard, safe areas, and one-handed controls.
- Product target: 44–48 px touch controls, 16 px body/form text, generally 14 px recurring labels, no sub-12 px essential text. These are design targets, not a claim about WCAG minimum font sizes.
- Keyboard operation, visible focus, no hidden active control under sticky elements, understandable status announcements, and no color-only meaning.
- Modal focus is contained, Escape closes, background interaction is prevented, and focus returns appropriately. Reference: [W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
- Track mobile and desktop real-user performance separately: p75 LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1. These are future acceptance targets, not measurements achieved in this review. Reference: [Google Web Vitals guidance](https://web.dev/articles/vitals).
- Every claimed completed feature has a behavioral test and a successful real journey, including failure recovery—not only a present button or passing source-string assertion.

## Remaining validation boundaries

No production signed-in account was used. Live signup delivery, sign-out, onboarding save, favorites persistence, claim submission/approval, event registration, messaging, paid services, AI-provider calls, media processing, actual offline reload/sync, and real-device sensors remain unverified in this cycle. No destructive security test, independent penetration test, legal review, database restoration rehearsal, or new statewide course audit was performed.

Do not add these unverified capabilities to a completed-feature list. Use a dedicated staging dataset and test accounts for the next full authenticated test pass; retain provider configuration and business approval as explicit dependencies where relevant.

## Recommended first implementation request

Implement slice 1, then slice 2, with browser regressions for toolbar overlap, active-hole restoration, truthful durable-save status, actual layout pars, and consent-based guest-round import. Keep the scope focused; do not bundle a brand redesign or new paid providers into that reliability release.
