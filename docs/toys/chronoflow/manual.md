# CHRO1 — Chronoflow: The Tidal Archive

## What this toy does

Chronoflow is an in-development 2D water-routing puzzle. Plan a route through the archive's channels and gates, then use the shared tide window to deliver water to a sealed memory chamber. Water should respond to pressure, gravity, inertia, and material resistance; the clock-sensitive puzzle phase will come from Dadeto's Internet time service. This handbook describes the design contract while the playable build is being implemented.

## Input

The planned controls select a cell, rotate a channel, toggle a gate, prime a pump, inspect a cell, reset, and pause. Keyboard, touch, gamepad, and the embedded toy will issue the same commands. Exact key bindings will be added with the playable vertical slice.

### Example

```json
{ "actions": ["select:3,4", "rotate-clockwise", "inspect"] }
```

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "actions": {
      "type": "array",
      "items": { "type": "string" }
    },
    "pause": { "type": "boolean" },
    "reset": { "type": "boolean" }
  }
}
```

## Output

The planned output is a responsive pixel-art board with visible water depth and flow, pressure/volume readings, level objective, tide phase, and a clear clock-sync status. A stale or unavailable clock pauses timed play and offers untimed practice; the device's wall clock never grants a timed completion.

### Example

```json
{
  "type": "chronoflow",
  "level": "archive-entry",
  "water": { "volume": 18.5, "targetVolume": 24, "overflow": false },
  "tide": { "phase": "rising", "clockStatus": "synchronized" }
}
```

## Behavior

The playable build is not available yet. The deterministic solver and page controls are upcoming milestones described in `spec.md`. Timed puzzle state will be derived from a fresh server-time sample plus monotonic elapsed duration. Offline play remains an untimed practice copy. See `acceptance.md` for the full playable-game completion bar and `harness.md` for planned verification.
