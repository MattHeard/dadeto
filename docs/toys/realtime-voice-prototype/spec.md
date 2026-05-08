# Toy Spec: Realtime Voice Prototype

## Summary
- Toy name: Realtime Voice Prototype
- Blog key: REAL2
- Owner: Dadeto browser plus local/cloud Realtime relay environments
- Last updated: 2026-05-07

## Problem Statement
- Prove that a phone browser can use Dadeto's existing toy surface to start an OpenAI Realtime WebRTC voice session.
- Keep the OpenAI API key out of browser code by sending the browser SDP offer to an API-key-holding server selected by JSON config.

## Boundary
- Browser toy presenter owns microphone permission, WebRTC setup, remote audio playback, and connection controls.
- The selected local or cloud relay owns the authenticated OpenAI `/v1/realtime/calls` request.
- Core owns the browser-safe toy payload, config parsing, and minimal OpenAI session configuration.

## Scope
- In scope:
  - Dadeto toy entry rendered through `src/build/blog.json`.
  - JSON input that selects `"server":"local"` or `"server":"cloud"`.
  - Local endpoint override with `localEndpoint` and cloud endpoint override with `cloudEndpoint`.
  - Connect / Disconnect / Mute controls in the toy output presenter.
  - Browser SDP offer sent to the selected `/api/realtime/call`-compatible endpoint.
  - Local server SDP exchange with OpenAI Realtime WebRTC.
  - Cloud Function SDP exchange through `src/cloud/realtime-call/index.js`.
- Out of scope:
  - Native Android or Wear OS code.
  - Watch integration.
  - Tool calling.
  - Raw audio storage or logging.
  - Shipping an OpenAI API key or bearer token to browser code.

## Config Input

```json
{"server":"local","localEndpoint":"/api/realtime/call"}
```

```json
{"server":"cloud","cloudEndpoint":"https://example.com/api/realtime/call"}
```

Optional browser-safe `title` and `description` strings override the presenter copy. Unknown fields are ignored and are not copied into the browser payload.

## Actors and Interfaces
- Primary actor(s): phone browser user running Dadeto over LAN or against a deployed cloud relay.
- Inputs: optional JSON presenter/relay config in the toy input field; microphone audio after Connect.
- Outputs: status text, selected server label, concise debug events, remote streamed model audio.

## Assumptions and Constraints
- Assumptions:
  - `OPENAI_API_KEY` is set in whichever relay server the selected endpoint reaches.
  - The phone can reach the selected endpoint over LAN or the public internet.
  - Cloud relays expose an SDP-compatible `POST` endpoint and appropriate CORS policy for Dadeto.
- Constraints:
  - Browser code must never include or receive the OpenAI API key.
  - Debug logs must not include raw audio or SDP bodies.

## Dependencies
- Internal dependencies:
  - `src/core/browser/toys/2026-05-07/realtimeVoicePrototype.js`
  - `src/browser/presenters/realtimeVoicePrototype.js`
  - `src/local/openaiRealtimeCalls.js`
  - `src/local/server.js`
  - `src/cloud/realtime-call/index.js`
  - `src/core/realtime/openaiRealtimeCalls.js`
- External dependencies:
  - OpenAI Realtime WebRTC `/v1/realtime/calls`
  - Browser `RTCPeerConnection` and `getUserMedia`
