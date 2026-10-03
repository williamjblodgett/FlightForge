# Production alert repair — October 3, 2026

## Confirmed causes

1. CI and Pages used Node 22.13, but the SQLite test adapters call `StatementSync.columns()`, introduced in Node 22.16. Local validation used Node 24 and missed this mismatch. Both workflows now read the pinned 22.23.3 version from `.node-version`; package minimum and setup instructions agree.
2. The scheduled production check repeatedly failed on the same genuine authentication outage. The latest examined run was 37080542125: homepage reachable, database/schema/storage healthy, authentication unavailable, `/api/health` correctly returning 503. The configured Supabase hostname returned NXDOMAIN on October 3. Its exact project state cannot be inferred from DNS alone.
3. The deployment workflow performed an availability check even when no deployment hook existed, incorrectly labeling an existing dependency outage as a failed deployment.
4. A fresh registry audit also found newly published dependency advisories. Next/eslint-config-next move to 16.3.8, Undici stays on major 7 at patched 7.30.0, and brace-expansion/fast-uri receive compatible fixes. The unpatched braces advisory is addressed by a checked-in MIT-licensed depth-limit backport, not an audit exception; see `vendor/braces/README.md` and its exploit-regression tests. Local forks need ongoing review because registry audits do not establish their safety.

## Changes and monitoring semantics

- Preserve the real 503 health response and all authentication protections.
- Continue the existing 15-minute schedule (GitHub can delay scheduled runs).
- Confirm failed probes once, then maintain one bot-owned GitHub incident per continuous outage. Repeated identical failures cause no issue writes/comments. Changed failures notify through the incident; recovery comments and closes it. A recurrence creates a new incident.
- Every run includes explicit HEALTHY/DEGRADED availability in its summary. A successful monitor job means checking and incident reporting succeeded, **not** that the application is healthy. API/reporting/configuration failures still fail the workflow and send the normal failure notification.
- Serialize monitor runs. Ignore user-created issue markers and pull requests. Persist only fixed diagnostic codes, a sanitized release identifier and public URLs; never dump HTML, provider response bodies, keys or user data.
- Explicitly skip deployment when the hook is absent. When configured, report only request acceptance; native Sites status remains the authoritative deployment result. Availability is monitored independently.
- Require successful CI from a push to this repository's main branch, not an untrusted fork PR; manual deployment requests must also target main.

## Validation checklist

- [x] Node 22.23.3: 274 unit tests, typecheck, lint (five existing navigation warnings), 19 migrations / 156 tables
- [x] Production build, 11 rendered integration tests and 3 Pages build tests
- [x] Full registry audit: zero reported vulnerabilities; vendored backport independently regression-tested
- [ ] GitHub CI and Pages deployment successful for repaired main commit
- [ ] Two live monitor runs reuse one incident with no duplicate comments
- [ ] Native Sites source publication aligned
- [ ] Supabase service restored and authentication healthy (requires dashboard access)

## Supabase recovery

Open the existing project dashboard as its owner. Verify whether the project is paused, removed, or has different connection details; restore that same project where possible. Do not create a replacement or change production identity mappings without a migration plan. Configure corrected approved values through Sites runtime secrets/settings if needed, then verify `/auth/v1/health`, verified-email login, reset delivery and `/api/health`. The monitor resolves its incident only after all checks pass.

Node API reference: https://nodejs.org/download/release/v22.17.0/docs/api/sqlite.html#statementcolumns
