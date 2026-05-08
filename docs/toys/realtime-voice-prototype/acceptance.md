# Acceptance: Realtime Voice Prototype

## User-visible behavior
- The toy appears in the normal Dadeto generated blog/toy list as `REAL2`.
- The toy's default input mode is `textarea` so users can paste JSON config.
- The toy's default output mode is `realtime-voice`.
- Empty or invalid config uses the local server endpoint `/api/realtime/call`.
- Config `{"server":"local","localEndpoint":"/api/realtime/call"}` labels the presenter as `local server` and posts offers to the local endpoint.
- Config `{"server":"cloud","cloudEndpoint":"https://example.com/api/realtime/call"}` labels the presenter as `cloud server` and posts offers to the configured cloud URL.
- The repository includes a `realtimeCall` Cloud Function that implements the same SDP relay contract as the local `/api/realtime/call` route.
- Pressing Submit renders Connect, Disconnect, and Mute controls inside the toy output area.
- Pressing Connect requests microphone permission, creates a WebRTC offer, and sends the SDP offer to the selected endpoint.
- The browser applies the SDP answer returned by the selected server and plays incoming remote audio.
- Disconnect stops media tracks, closes the data channel, closes the peer connection, and resets status.
- The phone local harness serves the writer app over HTTPS with a trusted local certificate so microphone permission is available on a LAN URL.

## Security behavior
- The browser toy payload contains only browser-safe display/config fields.
- The OpenAI API key is read by the selected relay server from `OPENAI_API_KEY` or equivalent server-only configuration.
- Browser logs do not store raw audio or SDP.

## Evidence
- `npm test` passes.
- `npm run build` includes the toy entry and browser presenter in generated public assets.
- `npm run build:cloud` packages the `realtime-call` Cloud Function directory for Terraform.
- `npm run lint` has no new warnings for realtime voice files.
