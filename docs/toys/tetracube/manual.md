# Tetracube — Open Ground field guide

## What this toy does

Build a free-form voxel structure from one randomly offered four-cube piece at a time. Walk and fly through the open world, move the translucent piece preview, rotate it around world axes, and place it where it will settle. Mine pieces to see unsupported structures settle again.

Play the standalone game at [/tetracube/](/tetracube/).

## Input

Use the keyboard, pointer, or on-screen touch buttons. Drag the world view to look around; click the canvas first to focus keyboard controls.

### Example

```json
"Hold W to walk forward, drag to look, press R to rotate the preview, then Enter to place it."
```

If the preview is blocked, move it with I/J/K/L or change its distance with [ and ]. Rotation changes only after explicit input and remains anchored to the world axes.

### Schema

The game's input is direct browser interaction rather than a JSON request. This schema records the keyboard command vocabulary for reference; the standalone page handles the actual key and pointer events.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "string",
  "enum": [
    "W", "A", "S", "D", "Q", "E",
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    "I", "J", "K", "L", "[", "]",
    "R", "F", "T", "G", "Y", "H",
    "Enter", "Backspace", "Z", "X"
  ]
}
```

## Exact property names

The game consumes browser keyboard, pointer, and touch events directly. It has no JSON input properties.

## Output

The game renders a perspective world with the placed structure, a crosshair-following ghost piece, and an exact landing preview. Status text reports placement, mining, undo, reset, and blocked previews.

### Example

```json
{
  "placedPieces": 3,
  "preview": "clear",
  "status": "A new piece is ready."
}
```

## Behavior

Every piece contains four face-connected cubes and falls as one rigid shape. The first voxel contact supports a piece, including broad overhangs. Mining removes a piece without returning it to the offer. Unsupported pieces settle immediately without rotation or animation. Player movement passes freely through the structure. There is no score or win condition.

## Controls

- W A S D: walk and strafe.
- Q / E: fly down / up.
- Drag the pointer or use arrow keys to look around.
- I J K L: shift the ghost across the world grid.
- [ / ]: move the ghost nearer / farther.
- R / F: rotate around world X.
- T / G: rotate around world Y.
- Y / H: rotate around world Z.
- Enter: place at the shown landing position.
- Backspace: mine the piece under the crosshair.
- Z: undo the last placement or mining action.
- X: reset the construction and seeded piece stream.

## Limits and assumptions

The initial world is a finite nearby grid for drawing, with no horizontal movement boundary. Player collision with structures is disabled. There is no persistence between visits, multiplayer, objective, resource economy, falling animation, tipping, torque, or structural-strength simulation.
