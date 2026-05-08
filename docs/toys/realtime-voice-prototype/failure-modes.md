# Failure Modes: Realtime Voice Prototype

## Microphone permission denied
- Symptom: status moves to `error` and the debug log shows a browser permission failure.
- Recovery: grant microphone permission for the LAN origin and press Connect again.

## Missing server API key
- Symptom: `/api/realtime/call` returns a server error indicating `OPENAI_API_KEY` is required.
- Recovery: export `OPENAI_API_KEY` before starting `npm run start:writer`.

## Phone cannot reach local server
- Symptom: the toy page loads only from localhost, or Connect fails when posting SDP.
- Recovery: open `http://<computer-lan-ip>:4321/index.html` from the phone and ensure firewall/LAN routing allows the port.

## Browser unsupported WebRTC/microphone APIs
- Symptom: Connect fails before SDP exchange.
- Recovery: test in a modern mobile browser with secure-origin microphone support for localhost/LAN development.

## Accidental sensitive logging
- Symptom: debug output includes SDP or audio details.
- Recovery: keep presenter logs to status/event type summaries only; do not print SDP bodies, raw audio, or API keys.

## Cloud relay unreachable or misconfigured
- Symptom: the presenter says `Session server: cloud server`, then Connect fails when posting SDP to the configured `cloudEndpoint`.
- Recovery: verify the cloud URL is HTTPS, reachable from the phone browser, is the deployed `realtimeCall` Cloud Function or implements the same `application/sdp` response contract as the local `/api/realtime/call` route, has `OPENAI_API_KEY` configured server-side, and allows the Dadeto origin via CORS.

## Wrong server mode selected
- Symptom: the presenter labels the unexpected server (`local server` or `cloud server`) after Submit.
- Recovery: edit the toy input JSON to use exactly `{"server":"local"}` or `{"server":"cloud","cloudEndpoint":"https://..."}` and press Submit again before Connect.
