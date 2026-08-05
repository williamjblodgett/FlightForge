# Security notes

## Implemented in this slice

- server-side identity and role checks on every write and administrator read;
- exact role-to-permission helpers instead of hidden-UI authorization;
- elevated email allowlists apply only to dispatch-authenticated hosted identities; an unverified password signup cannot inherit a coordinator, owner, or administrator role by matching an email string;
- PBKDF2-SHA256 password hashing with per-user salts and a 210,000-iteration work factor;
- opaque 256-bit session tokens stored only as SHA-256 hashes server-side;
- secure, HTTP-only, SameSite cookies with expiration and logout revocation;
- direct sign-out controls in the desktop header and profile/setup screens, including dispatch-owned sign-out for hosted identities;
- forced replacement of the JPhillips bootstrap password, with all prior sessions revoked on change;
- hard-coded role demo auth unavailable in production, even if its local feature variable is set;
- same-origin checks on cookie-affecting mutations;
- hashed D1 rate-limit keys for sign-in, favorites, claims, event writes, bag writes, caddie requests, and reviews, with both network and normalized-account throttles on password sign-in;
- one shared post-authentication return-path validator that rejects cross-origin, backslash-normalized, protocol-relative, and reserved-auth destinations;
- strict Zod input validation and safe error envelopes;
- private R2 evidence with authenticated streaming only;
- matching file-size, extension, MIME-type, and binary-signature checks;
- sanitized object keys and filenames;
- production response CSP, HSTS on HTTPS, `nosniff`, referrer policy, permissions policy, authenticated-response no-store behavior, and identity-aware `Vary` fields;
- a static Pages CSP compatible with the same-origin PWA and the allowlisted OpenStreetMap frame;
- no raw card data or payment integration;
- review reasons, optimistic versions, and append-only application audit events;
- event organizer ownership isolation, actor-aware status audits, idempotent creation, and atomic conditional audit writes;
- per-user bag ownership, soft deletion, optimistic versions, atomic bag-slot/audit writes, and recommendation-to-disc feedback binding;
- runtime event, bag, and caddie controls that fail closed when configuration storage is unavailable;
- no precise player home addresses;
- source attribution and clear fictional/unverified labels;
- reduced-motion and keyboard-focus support.

## Required before public production

- connect a production malware scanner and quarantine step for uploads;
- add email verification, password reset, MFA/passkeys, device/session management, and richer brute-force telemetry;
- perform organization-isolation and authorization penetration tests;
- implement data export, deletion, retention, and legal-hold workflows;
- review audit-log immutability at the infrastructure level;
- configure monitoring, alerting, secrets rotation, and incident response;
- verify distributed rate limiting under concurrency;
- add abuse controls for messaging, reviews, social play, and future AI;
- obtain attorney review for privacy, location, media, minors, liability, marketplace payments, affiliate sales, and international expansion.

## Security scan report

As of 2026-08-04:

- `npm audit` reports 0 known vulnerabilities across 740 production, development, optional, and peer dependency records;
- a clean locked install completes with 0 vulnerabilities;
- the npm dependency tree exits successfully; npm labels two Windows-installed Sharp WASM optional packages as extraneous even after `npm ci`, but neither is imported by application code and both remain covered by the audit;
- tracked-source pattern checks found no AWS access key, private key, GitHub token, OpenAI key, or live Stripe key;
- `.env.local` and all other `.env*` files remain ignored; only the placeholder-only `.env.example` is tracked;
- source review found no `eval`, `new Function`, `document.write`, `Math.random` security-token generation, or executable child-process use in application code;
- CodeQL `security-extended`, `npm audit --audit-level=high`, and Dependabot configuration now run or update through GitHub;
- GitHub secret scanning, secret-scanning push protection, vulnerability alerts, and Dependabot security updates are enabled for the repository;
- 66 unit tests, 7 rendered server-flow tests, 3 Pages artifact tests, type checking, linting, both production builds, seven D1 migrations, 128 D1 tables, reviewed disc-catalog validation, and both Maine seed validations pass locally.

This is a code and dependency hardening pass, not a claim of complete security. It does not replace an independent penetration test, cloud configuration review, malware sandbox, operational monitoring, backup/restore exercise, or attorney review.

## AI boundary

The active caddie is a deterministic rules engine, not a remote generative-AI provider. It records model/schema versions, validates inputs, explains reasoning, calibrates confidence, exposes missing information, and never blocks the bag if recommendation generation fails. Future multimodal or external-provider requests still require provider abstraction, structured output validation, consented media, safety review, no medical claims, and graceful failure that never blocks booking or scoring.
