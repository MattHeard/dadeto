# THREEFOLD — Field Guide

## What this toy does

Explore Harrowfen's Broken Gate in a deterministic, scale-shifting handheld RPG prototype. Mara's size changes while the same physical place stays connected. Play the standalone game at [/threefold/](/threefold/).

Before the first timed action, a dock worker warns, “The tide is climbing. That gate will not hold.” The opening goal is to investigate the failing gate and decide how to respond; the game does not prescribe a solution.

## Input

Use the arrow keys or directional pad to move. A grows one unlocked scale step; growth can break through obstructing geometry and leave permanent rubble. B shrinks one step. X deliberately waits 15 in-game minutes. Y saves. Save, Export, Import, Pause, Fullscreen, and Reset are also available on the page.

Every 15 in-game minutes, Mara recovers one Anchor charge. Movement and scale attempts add a quarter minute to recovery progress. Waiting can restore Anchor even after the crisis reaches aftermath; the crisis stage itself remains at aftermath.

### Example

```json
{ "actions": ["right"] }
```

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "actions": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["up", "down", "left", "right", "a", "b", "x", "y"]
      }
    },
    "save": { "type": "string" }
  }
}
```

## Output

The standalone page renders a pixelated 160 × 144 frame with scale, Anchor, and crisis stage information. Mara's sprite remains handheld-sized while geometry changes scale.

### Example

```json
{
  "type": "threefold",
  "width": 160,
  "height": 144,
  "pixelated": true,
  "mode": "world"
}
```

## Behavior

Movement, scale transitions, and deliberate waiting advance the deterministic game-time crisis clock. The clock never uses browser wall time. Menu, pause, save, import/export, and reading this guide leave game time unchanged. The complete player/crisis state, including destroyed geometry, is stored locally and revalidated when loaded.
