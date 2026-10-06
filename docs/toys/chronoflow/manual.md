# CHRO1 — Chronoflow: The Tidal Archive

## What this toy does

Chronoflow is a 2D water-routing puzzle. In the first playable level, route water through the archive's channels and gate to a sealed memory chamber. The deterministic fluid model responds to pressure, gravity, inertia, and material resistance. Clock-sensitive puzzles will use Dadeto's Internet time service; this first level is untimed practice.

## Input

The first level provides buttons to open the sluice, advance 60 fixed fluid steps, and reset the level. The board is responsive and its cells expose water and terrain labels to assistive technology. Keyboard and touch users can operate the same buttons. The Internet tide status and phase are fetched from Dadeto's server-time endpoint; if configuration or sync fails, the page clearly remains untimed practice. This first level never grants timed completion.

### Example

```json
{ "actions": ["open-sluice", "advance-water", "reset-level"] }
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
  "water": { "volume": 12, "targetVolume": 12, "overflow": false },
  "tide": { "phase": "practice", "clockStatus": "untimed" }
}
```

## Behavior

Play the first level at `/chronoflow/`. Open the sluice, then advance water in fixed batches until the archive chamber fills to at least 12%. Reset restores the initial board. This level is explicitly untimed practice; tide timing and the trusted clock adapter remain upcoming milestones described in `spec.md`. The device clock never affects this prototype. See `acceptance.md` for the full playable-game completion bar and `harness.md` for verification.
