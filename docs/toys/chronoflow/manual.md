# CHRO1 — Chronoflow: The Tidal Archive

## What this toy does

Chronoflow is a 2D water-routing puzzle. In the first playable level, route water through the archive's channels and gate to a sealed memory chamber. The deterministic fluid model responds to pressure, gravity, inertia, and material resistance. A fresh Internet clock can award a timed high-tide record; stale or unavailable sync keeps the puzzle playable as unscored practice.

## Input

The first level provides a junction valve to select the archive or a decoy drain, two marked stone cells that can be reshaped with a three-edit budget, a timed-attempt control, a sluice control, fixed-step advance, and reset. Select a marked cell and use the edit button to carve or refill it. Either carving cell 8 or cell 12 opens a valid route to the archive. Reset restores the walls and all three edits. Puzzle progress is saved locally with schema, rules, and solver versions; restored attempts resume as untimed practice and reacquire a fresh Internet clock before timed play. Trusted server time and timed credit are never loaded from the save. The board is responsive and its cells expose water and terrain labels to assistive technology. Keyboard and touch users can operate the same buttons. The Internet tide status and phase are fetched from Dadeto's server-time endpoint. Practice can always complete the archive puzzle without a record. A timed attempt can start only when a fresh Internet clock is safely inside high tide; sluice and advance controls pause outside that trusted window. Completing the target during the active high-tide attempt earns the timed record.

### Example

```json
{ "actions": ["select-editable-cell", "carve-channel", "route-archive", "open-sluice", "advance-water", "reset-level"] }
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

The current output is a responsive water-depth board with direction markers derived from solver velocity, two visibly marked editable cells, a three-edit counter, and a selectable-cell readout for depth, normalized hydraulic head, and velocity. The board also shows an archive target, tide phase, and clock-sync status. Future levels can add pixel-art scenery and tide-driven simulation. A stale or unavailable clock denies timed credit while leaving the puzzle playable; the device's wall clock never grants a timed completion.

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

Play the full first level at `/chronoflow/`. Select one of the dashed stone cells and carve a channel, route the junction to the archive, open the sluice, then advance water in fixed batches until the archive chamber fills to at least 12%. Reset restores the initial board and edit budget. A trusted synchronized high tide at the instant the chamber fills awards a timed record; all other cases complete as practice. The device clock never affects this prototype.

The CHRO1 embedded toy is an untimed command-stream preview using the same solver. Submit a JSON object with a `commands` array; for example:

```json
{"commands":[{"type":"route","value":"archive"},{"type":"edit","cell":11},{"type":"open"},{"type":"advance","steps":60,"batches":5}]}
```

It renders the resulting board and exposes its solver snapshot in the returned canvas payload. Embedded previews always remain practice and cannot award timed credit. See `acceptance.md` for the full playable-game completion bar and `harness.md` for verification.
