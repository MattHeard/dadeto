# REAL2 — Realtime Voice Prototype

## What this toy does

Realtime Voice Prototype mounts a browser-based WebRTC voice interface for an OpenAI Realtime session.

The browser does not receive the OpenAI API key. Instead, it sends a Session Description Protocol offer to a local or cloud relay endpoint. That server is responsible for talking to OpenAI and returning the SDP answer.

## Input format

Paste a JSON config object.

### Local mode

```json
{
  "server": "local"
}
```

Local mode uses `/api/realtime/call` by default.

You can override the local endpoint:

```json
{
  "server": "local",
  "localEndpoint": "/api/realtime/call"
}
```

### Cloud mode

```json
{
  "server": "cloud",
  "cloudEndpoint": "https://example.com/api/realtime/call"
}
```

Cloud mode requires `cloudEndpoint`.

## Optional display fields

You can customize the visible title and description:

```json
{
  "server": "local",
  "title": "Voice Test",
  "description": "Press Connect and test the realtime voice relay."
}
```

## Defaults

If the input is empty, malformed, or does not specify `"server": "cloud"`, the toy uses local mode.

Default local endpoint:

```text
/api/realtime/call
```

Default title:

```text
Realtime Voice Prototype
```

Default description:

```text
Press Connect, grant microphone permission, speak, and listen for streamed OpenAI Realtime audio.
```

## What the interface shows

The realtime voice presenter shows:

- title
- description
- selected session server
- connection status
- **Connect** button
- **Disconnect** button
- **Mute** button
- debug log

The debug log records connection lifecycle messages. It does not log raw audio or raw SDP.

## How to use it

1. Choose local or cloud mode.
2. Paste the JSON config.
3. Click **Submit**.
4. Click **Connect**.
5. Grant microphone permission when the browser asks.
6. Speak into the microphone.
7. Listen for streamed realtime audio.
8. Use **Mute** to disable microphone audio.
9. Use **Disconnect** to close the session.

## Connection flow

When you click **Connect**, the presenter:

1. checks that the configured endpoint is usable
2. disconnects any previous connection
3. requests microphone permission
4. creates an `RTCPeerConnection`
5. adds the microphone track
6. creates a debug data channel called `oai-events`
7. creates an SDP offer
8. posts the SDP offer to the configured endpoint
9. reads the SDP answer from the response body
10. applies the answer as the remote description
11. marks the connection as live

The POST request uses:

```text
Content-Type: application/sdp
```

The request body is the SDP offer.

## Endpoint requirements

The configured endpoint must accept a browser SDP offer and return an SDP answer.

For local mode, your site should expose:

```text
/api/realtime/call
```

For cloud mode, provide a full URL in `cloudEndpoint`.

If cloud mode is selected without `cloudEndpoint`, the toy reports:

```text
Cloud server mode requires a cloudEndpoint URL.
```

## Status values

The interface may show:

- `disconnected`
- `connecting`
- `live`
- `error`

## Controls

### Connect

Starts a new WebRTC voice session.

### Disconnect

Stops local media tracks, closes the data channel, closes the peer connection, clears remote audio, and resets the UI.

### Mute

Toggles the microphone track. When muted, the button changes to **Unmute**.

## Tips

- Use headphones to prevent feedback loops.
- Use local mode first during development.
- Use HTTPS for cloud endpoints.
- Keep the OpenAI API key only on the server.
- Check the debug log if connection setup fails.

## Troubleshooting

### Cloud mode shows an endpoint error

Add `cloudEndpoint`.

```json
{
  "server": "cloud",
  "cloudEndpoint": "https://your-domain.example/api/realtime/call"
}
```

### The browser asks for microphone permission

That is expected. The presenter needs microphone access for the voice session.

### The session fails after microphone permission

Check that your relay endpoint is reachable and returns a valid SDP answer.

### The server returns an error

The presenter shows a concise error based on the HTTP status and response body.

### No audio plays

Check browser autoplay behavior, audio output device, relay configuration, and whether the remote stream is actually being sent.

### Mute does not affect the remote model

Mute toggles the local microphone track. If the session already received audio before muting, the remote model may still respond to what it already heard.
