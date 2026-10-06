# CHRO1 — Chronoflow: The Tidal Archive

## What this toy does

Chronoflow is a 2D water-routing puzzle. In the first playable level, route water through the archive's channels and gate to a sealed memory chamber. The deterministic fluid model responds to pressure, gravity, inertia, and material resistance. A fresh Internet clock can award a timed high-tide record; stale or unavailable sync keeps the puzzle playable as unscored practice.

## Input

The first level provides buttons to open the sluice, advance 60 fixed fluid steps, and reset the level. The board is responsive and its cells expose water and terrain labels to assistive technology. Keyboard and touch users can operate the same buttons. The Internet tide status and phase are fetched from Dadeto's server-time endpoint. Filling the archive chamber always completes the puzzle; it grants a timed high-tide record only if a fresh synchronized Internet clock places that completion in the high phase. Other phases and stale/offline sync remain playable practice and receive no timed record.

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

The current output is a responsive water-depth board with an archive target, tide phase, and a clear clock-sync status. Future levels can add pixel-art scenery, pressure/volume readings, editable channels, and tide-driven simulation. A stale or unavailable clock denies timed credit while leaving the puzzle playable; the device's wall clock never grants a timed completion.

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

Play the first level at `/chronoflow/`. Open the sluice, then advance water in fixed batches until the archive chamber fills to at least 12%. Reset restores the initial board. A trusted synchronized high tide at the instant the chamber fills awards a timed record; all other cases complete as practice. The device clock never affects this prototype. See `acceptance.md` for the full playable-game completion bar and `harness.md` for verification.
