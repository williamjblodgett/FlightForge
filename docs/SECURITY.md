# Security notes

## Implemented in this slice

- server-side identity and role checks on every write and administrator read;
- exact role-to-permission helpers instead of hidden-UI authorization;
- signed, HTTP-only, SameSite demo cookies with expiration;
- demo auth disabled unless explicitly enabled;
- same-origin checks on cookie-affecting mutations;
- hashed D1 rate-limit keys for sign-in, favorites, claims, and reviews;
- strict Zod input validation and safe error envelopes;
- private R2 evidence with authenticated streaming only;
- file-size, file-signature, and allowlisted-format checks;
- sanitized object keys and filenames;
- no raw card data or payment integration;
- review reasons, optimistic versions, and append-only application audit events;
- no precise player home addresses;
- source attribution and clear fictional/unverified labels;
- reduced-motion and keyboard-focus support.

## Required before public production

- connect a production malware scanner and quarantine step for uploads;
- verify runtime CSP and security headers at the edge;
- add session revocation, device/session management, and brute-force telemetry to the chosen public identity provider;
- perform organization-isolation and authorization penetration tests;
- implement data export, deletion, retention, and legal-hold workflows;
- review audit-log immutability at the infrastructure level;
- configure monitoring, alerting, secrets rotation, and dependency scanning;
- verify distributed rate limiting under concurrency;
- add abuse controls for messaging, reviews, social play, and future AI;
- obtain attorney review for privacy, location, media, minors, liability, marketplace payments, affiliate sales, and international expansion.

## Dependency report

As of 2026-08-03, `npm audit` reports zero known vulnerabilities across production and development dependencies. The package manifest pins compatible patched transitive versions for Next.js image/CSS tooling and esbuild. Keep the audit in CI, refresh these pins deliberately, and re-run the complete build and rendered-route suite after dependency changes.

## AI boundary

No AI provider is called in this slice. Future AI requests must use structured validated output, provider abstraction, prompt/model version logs, confidence and missing-information fields, consented media, no medical claims, and graceful failure that never blocks booking or scoring.
