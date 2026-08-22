# Decision log

## D-001 — Modular monolith

Use one TypeScript application with bounded modules. Rationale: strong transaction boundaries and simpler operations outweigh premature service separation.

## D-002 — PostgreSQL/PostGIS target with hosted slice bindings

Model the production domain in PostgreSQL/PostGIS while using Sites D1/R2 for a durable deployed first slice. Rationale: satisfy geographic and relational requirements without faking persistence in the hosted preview. Consequence: a repository-adapter wiring task remains before standalone production.

## D-003 — Source-aware seeds

Store source URL, source type, review timestamp, verification status, and fictional flag. Rationale: protect trust and copyright while making operator verification visible.

## D-004 — Standalone accounts, gated demo auth

Use FlightForge email/password accounts backed by Supabase Auth, retain revocable password sessions during migration, and keep signed demo sessions local-only. Ignore hosting-platform identity headers. Rationale: players can create and recover a FlightForge account without a ChatGPT account, while verified email, consent, and server-side authorization remain enforceable.

## D-005 — Provider-neutral launch map

Render accessible approximate pins without a third-party token and place directions behind a map-service interface. Rationale: the first slice remains usable without presenting a fake live provider integration.

## D-006 — Private evidence proxy

Store evidence in private R2 and authorize every download server-side. Rationale: object keys never become public bearer URLs and administrators remain auditable.

## D-007 — No copied course imagery

Use original code-native terrain art for the first release. Rationale: avoid unlicensed photography while giving every card a clear visual identity.

## D-008 — Separate static demonstration adapter

Build GitHub Pages as a public, credential-free client over the same pure domain engines, with versioned and validated device-local records. Rationale: GitHub Pages can demonstrate complete interaction design and offline behavior but cannot safely host trusted identity, payments, shared inventory, private uploads, or server authorization. The interface discloses this boundary on every relevant flow.
