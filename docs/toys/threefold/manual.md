# THREEFOLD — Field Guide

## What this toy does

Explore Harrowfen's Broken Gate in a deterministic, scale-shifting handheld RPG prototype. Mara's size changes while the same physical place stays connected. Play the standalone game at [/threefold/](/threefold/).

Before the first timed action, a dock worker warns, “The tide is climbing. That gate will not hold.” The opening goal is to investigate the failing gate and decide how to respond; the game does not prescribe a solution.

## Input

Use the arrow keys or directional pad to move. A grows one unlocked scale step; growth can break through obstructing geometry and leave permanent rubble. B shrinks one step. Reach the Latchfolk watchkeeper and press E (or the gamepad's left shoulder button or the touch warning/rescue button) to warn the settlement; reach the ferry mooring to evacuate passengers. Both actions must begin before surge. X deliberately waits 15 in-game minutes. Y saves. Save, Export, Import, Pause, Fullscreen, and Reset are also available on the page.

Every 15 in-game minutes, Mara recovers one Anchor charge. Movement and scale attempts add a quarter minute to recovery progress. Waiting can restore Anchor even after the crisis reaches aftermath; the crisis stage itself remains at aftermath.

The ferry mooring and Latchfolk watchkeeper are marked in the world. An in-range rescue action before surge evacuates the ferry passengers. Warning the watchkeeper sends the settlement toward higher ground. At surge the ferry is lost; passengers still aboard and unwarned Latchfolk are lost, while evacuated passengers and warned Latchfolk remain safe. The outcomes are independent and saved with the run.

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
        "enum": ["up", "down", "left", "right", "a", "b", "x", "y", "interact"]
      }
    },
    "save": { "type": "string" }
  }
}
```

## Output

The standalone page renders a pixelated 160 × 144 frame with scale, Anchor, crisis stage, and passenger, ferry, and Latchfolk outcomes. A screen-space tide meter grows with deterministic in-game minutes and changes color by crisis stage; pausing and menus do not move it. Mara's sprite remains handheld-sized while geometry changes scale.

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

## Gate outcome

Growing through the relief gate or its counterweight commits that geometry as rubble and forces the gate open. Before the surge, the screen warns that the lower drainage channel is at risk. At surge, pixelated floodwater appears over the drainage settlement and remains through aftermath. The outcome is reconstructed from saved rubble IDs and the deterministic crisis stage; it does not use browser time or simulate fluid movement.
