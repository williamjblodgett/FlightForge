# Caddie conversation and satellite maps

## What is live

- Signed-in players can use persistent private caddie conversations from the Bag page.
- Every answer receives the player’s active owned-disc summary on the server.
- Without an AI provider, a versioned FlightForge field guide answers common wind, flight-number, technique, safety, and missing-context questions.
- With OpenAI configured, text requests use the Responses API with moderation, a privacy-preserving safety identifier, bounded history, `store: false`, rate limiting, and server-only credentials.
- With OpenAI Realtime configured, the browser uses WebRTC through a same-origin SDP endpoint. Push-to-talk disables the microphone track between questions and uses manual audio-buffer commits.
- Course pages use the Google Maps Embed API satellite view when a restricted browser key is present and retain the provider-neutral map preview otherwise.

## Required production configuration

Set secrets through the hosting environment, never in source control or chat:

```text
AI_PROVIDER=openai
AI_API_KEY=<server-only OpenAI project key>
AI_MODEL=gpt-5.6
AI_REALTIME_MODEL=gpt-realtime-2.1
AI_REALTIME_VOICE=marin
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<browser key restricted to the live domain and Maps Embed API>
```

The Google browser key is intentionally visible to the browser and must be restricted by allowed referrers and allowed APIs. Use a separate server key for future geocoding or routes. Configure budgets and quota alerts for both providers.

## Safety and privacy boundaries

- The language model does not query private tables directly. FlightForge supplies a bounded active-bag summary.
- The deterministic recommendation engine remains the source for structured shot selection; conversation is an explanatory layer.
- Caddie history is owner-scoped. Supabase tables have row-level security policies; the D1 runtime always filters by the persisted user ID.
- Advice discloses uncertainty, does not diagnose injuries, does not invent exact measurements, and reminds the player to check the throwing area.
- Realtime sessions are short-lived and the permanent OpenAI key never reaches the browser.
- Google coordinates and GPS are approximate and are not for emergency navigation or tournament distance certification.

## Operational checks before enabling provider modes

1. Restrict provider keys and set spend/usage alerts.
2. Test text moderation, provider failure, timeout, and fallback behavior in staging.
3. Test microphone denial, interrupted WebRTC sessions, Bluetooth audio, iOS Safari, and Android Chrome.
4. Confirm Google attribution and licensing requirements for the selected Maps APIs.
5. Review retained caddie history and account-export/deletion behavior before broad launch.
