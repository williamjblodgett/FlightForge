# Google sign-in activation

## Current state

Google OAuth code is present but disabled unless `GOOGLE_SIGN_IN_ENABLED=true` and Supabase public configuration is valid. Email/password remains available. This release does not claim that Google credentials, consent-screen branding or provider configuration have been completed.

On September 28, 2026, a read-only request to the configured Supabase hostname failed DNS resolution from the development machine. Check that the intended project exists and is running; do not infer permanent deletion from that one result.

## Account-side configuration

1. Open the intended Supabase project: https://supabase.com/dashboard/project/hpdkfgidjqqkejhyzbgf . Confirm its status and current project URL. Resume it if the dashboard says it is paused.
2. In Google Auth Platform, create/select a FlightForge project and configure Branding, Audience and Data Access. Use an accurate support address and the site's current Privacy/Terms pages. Review Google's production-brand requirements before public rollout; do not claim Google verification until granted.
3. Create an OAuth client of type **Web application**. Current JavaScript origin:
   `https://flightforge-maine-launch.williamjblodgett.chatgpt.site`
4. Copy the Google callback shown in Supabase's Google provider settings into Google's authorized redirect URIs. For the currently configured project this is:
   `https://hpdkfgidjqqkejhyzbgf.supabase.co/auth/v1/callback`
5. Put the Google client ID and client secret directly into Supabase's Google provider settings and enable that provider. Do not put the Google secret in chat, Git, browser code, or a `NEXT_PUBLIC_*` variable. FlightForge does not need a Google API key for sign-in.
6. Configure the Supabase Site URL to the FlightForge origin. Allow the FlightForge OAuth callback and its same-path continuation query:
   `https://flightforge-maine-launch.williamjblodgett.chatgpt.site/auth/google/callback**`
   Keep this narrowly scoped to the callback, not a domain-wide wildcard. Google returns to **Supabase** first; Supabase returns to **FlightForge**. Those are different URLs.
7. Configure only identity scopes (`openid`, email and profile). This app does not request Gmail, Drive, Calendar, offline Google access, or retain Google provider refresh tokens for API usage.
8. After provider configuration and review, set the server runtime flag `GOOGLE_SIGN_IN_ENABLED=true` and publish. For a custom domain, configure `NEXT_PUBLIC_APP_URL` to that HTTPS origin and update Google and Supabase settings together.

## Required live pilot before announcing availability

- New Google player: consent page, Terms/Privacy acceptance, onboarding/privacy choices, return to requested Bag/Coach/round destination.
- Returning linked player: direct return with existing favorites, scores and bag preserved.
- Legacy same-email account: explicit password-linking flow; no automatic D1 email merge.
- Denial, cancelled flow, missing verifier and expired/replayed code: recoverable error, no redirect loop.
- Sign out and sign back in; cookie persistence on mobile Safari and desktop.
- Actual password-reset email: recovery still works and a Google login code cannot mint recovery authority.
- Confirm production audience access, branding, redirect URLs, support, privacy and delivery settings. Google/Supabase account approval remains an account-side responsibility.

## Engineering boundaries

Uses the existing `@supabase/ssr` PKCE client and server-side `getUser()` validation. No new auth SDK, schema migration or privileged Supabase service-role key is required. A new verified Google identity has no FlightForge private-data access before the existing versioned app-consent and provisioning service succeeds. Existing account-status, role, identity-linking and onboarding checks remain in force. Rate limits and same-origin POST checks protect initiation and completion.

The dedicated Google callback does not accept password-recovery parameters. The shared callback verifies the exact newly exchanged token with `getClaims(token)` and requires a fresh, server-signed recovery authentication-method reference (AMR), expected issuer/audience and subject for code-based recovery. Neither the URL nor the SDK's browser-controlled PKCE `redirectType` can confer recovery authority. Token-hash recovery still requires successful server-side `verifyOtp` of the recovery type. Callback pages/responses are private/no-store and use no-referrer.

Hosted identities do not gain administrator/coordinator/owner privileges from matching configured email lists. They start as players; explicitly assigned existing roles survive, and privileged access requires explicit administrator assignment or the established approval/linking workflow. This applies on later session resolution too, even if a social identity adds a password or unlinks Google. Fresh local email-verification grants are unchanged; hosted privileged-role bootstrap via email environment lists is intentionally disabled.

Automated tests use mocked provider responses or an isolated disabled provider; they are not a substitute for the live pilot above. The deployment flag remains disabled until account-side configuration is available.

Sources: [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google), [PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Google production branding](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification).
