# Advanced provider readiness

## Implemented without external credentials

- Browser camera capture and private media records.
- On-device MediaPipe Pose Landmarker sampling across 12 frames, 33-point landmark overlay, visibility score, framing confidence, and bounded balance/shoulder observations.
- Pose summaries stored with the consented coaching job; raw frames are not sent merely to extract landmarks.
- Supabase-compatible PostgreSQL client, environment validation, administrator readiness endpoint, PostGIS migration path, and first RLS policies.
- GPS rangefinding with source accuracy and Google satellite handoff.

## Provider-dependent activation plan

| Capability | Activation requirement | Acceptance evidence |
| --- | --- | --- |
| Supabase database | Project URL, publishable key, service-role key, pooler URL, schema migration | RLS tests, repository parity, backup/restore test, cutover rehearsal |
| Supabase Auth | Redirect URLs, SMTP, OAuth provider credentials, MFA policy | Confirmation/reset/MFA/OAuth end-to-end tests and account migration plan |
| Multimodal coaching | Approved API key, privacy review, extracted keyframe pipeline | Structured-output validation, coach benchmark, false-certainty threshold, deletion trace |
| Disc tracking | Licensed labeled disc dataset and high-frame-rate capture protocol | Detection and tracking accuracy by lighting, disc color, blur, and distance |
| Release metrics | Camera calibration, known scale, high FPS, and disc detector | Error bounds against radar/high-speed reference equipment |
| Malware/transcoding | Scanner and isolated transcoder credentials | Malicious fixture quarantine, safe-format output, retry and deletion tests |
| Retention worker | Supabase Cron or hosting scheduler and secret | Scheduled run audit, inactive-user expiry, R2/database reconciliation |
| Google satellite | Maps project, restricted browser key, billing, map ID, terms review | Domain restriction, quota alerts, attribution, authorized usage review |
| Native AR depth | Separate Android/iOS application targets | Supported-device matrix and measured error bands by range |
| Laser rangefinder | Selected vendor/protocol and hardware | Pairing, permissions, timeout, manual fallback, field validation |
| Stripe Connect | Platform account and approved merchant-of-record/risk model | Sandbox onboarding, ledger/webhook reconciliation, refunds, disputes, payouts, tax review |
| Email/push | Custom SMTP and VAPID/APNs/FCM credentials | Opt-in, quiet hours, retry/dedupe, unsubscribe and delivery monitoring |
| Security/legal | Independent vendors and counsel | Penetration report closure, incident exercise, monitoring evidence, signed legal approvals |

## Measurement boundary

Pose landmarks locate the player's body; they do not locate the disc. Exact nose angle, spin, release speed, and velocity require a separate disc detector, higher frame rates, calibration, and reference testing. FlightForge must continue reporting these as unavailable rather than estimating false precision from a single ordinary phone video.
