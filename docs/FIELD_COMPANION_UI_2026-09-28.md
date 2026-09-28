# Field companion UI — September 28, 2026

## Scope and implementation

Implemented the user-approved three-screen concept in the existing application, not a separate mockup. Shared brand tokens and `app/field-companion.css` provide white surfaces, forest-green controls, restrained borders and equally weighted mobile navigation. Existing brand assets are retained.

- Home reads the authenticated player's active rounds, favorites and completed-round history through existing authorized repositories. Empty, guest and failed-read states remain distinct. Round dates use the device timezone after hydration, with an explicitly labeled UTC server fallback.
- Explore uses compact artwork-left cards, a state selector, labeled List/Map controls and opt-in Near me search. The existing map drawer, area search, pagination and URL filters remain available. Nearby searches coarsen coordinates before creating an approximate 25-mile-in-each-direction bounding box. This is an area search, not a promise of distance-sorted results. Late location callbacks cannot override newer navigation.
- Scoring has large stroke/penalty controls, Caddie/Bag/hole-video shortcuts, previous/next actions and the mobile navigation. Existing offline persistence, correction history, synchronization/conflict handling, finishing and video dialogs are retained. Changing save messages remain below the controls to avoid shifting a tap target.
- Favorite and sign-out buttons remain disabled until their client handlers are ready. Coarse-pointer scrolling is immediate so programmatic scrolling cannot move a form button during pointer input.

No database migration, role change, authentication-provider change, production data mutation or dependency upgrade is required. Existing access controls and storage remain in place.

## Data and images

The concept's fictional courses, scores and photographs were not inserted into the real catalog. Existing course artwork is explicitly illustrative; it is not a photo or course map. The Home landscape is labeled illustrative. Unknown pars, distances, prices and availability remain unknown. Operator-supplied, licensed course photos remain a future content task.

## Verification

- Strict TypeScript and ESLint passed.
- 182 unit tests across 50 files passed.
- 11 rendered-server/integration tests and 3 static Pages tests passed.
- Full browser suite: 74 passed across desktop Chromium, mobile Chromium and mobile WebKit; one pre-existing physical-iOS cold-offline verification remains skipped.
- Added regression coverage for nearby search/state cancellation and signed-in Home favorites, narrow layouts and companion shortcuts. Updated assertions to match the approved layout.
- Read-only audit: 174 public route/viewport combinations (1440, 390 and 320 px) passed without unexpected statuses, browser errors, missing assets, horizontal overflow or detected clipped controls.
- Inspected Home, Explore and scoring screenshots. Production build passed; the existing bundle-size and Vinext route-classification warnings remain.

Testing uses isolated databases, storage and test accounts. No test accounts or fictional activity are inserted into production.

## Release and remaining boundaries

Publish this same source commit to GitHub `main` and the existing FlightForge Sites application. Native deployment metadata is the authoritative release/commit record. GitHub Pages remains the separate static demo.

This is a UI and interaction release. It does not complete the outstanding primary-source course audit, Supabase database cutover, payment-provider setup or private-media processing integrations. Existing safety gates and operational limitations remain enforced.
