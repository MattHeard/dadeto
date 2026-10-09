# COMM1 — The Commons of Tomorrow

## What this toy does

Explore a two-district solarpunk RPG set in Tandem, a city where material needs are met but people still disagree about what matters most. Meet neighbors in Canopy Commons and the Living Weir, inspect the river and its infrastructure, then help record a community agreement. The standalone handheld is at [/the-commons-of-tomorrow/](/the-commons-of-tomorrow/). Both modes share the same deterministic game and independent save slots.

The main quest, **The River Keeps Its Own Time**, asks whether to restore the marsh, rebuild the shared crossing, or use the old gauge to make a seasonal pact. Agreements change the journal, district status and charter. There is no combat, currency score or alignment meter.

## Input

Keyboard, gamepad and virtual keypad use the directions plus A/B/X/Y. In the world, A talks to or inspects the feature directly ahead; nearby people and features show an A prompt. Sola is marked by a yellow chevron, backpack and facing indicator. Follow the pale stone path east from Canopy Commons to the WEIR sign. In the Living Weir, the narrow footbridge is just west of the flow board near the entrance. X opens the menu, Y opens **Assign an action to B**, and B performs the assigned action. Assignment stores the action and returns to the map; it does not perform it. In menus, A confirms, B returns to the previous menu (or closes the main menu to the map), and X closes the menu to the map. **Actions · Perform now** runs the selected action with A; **Assign an action to B** stores it for later use with B. Both screens show the current selection and their distinct button prompts. On the flow board, the goal is to route water into **IN**: arrows move the highlight, B switches between Marsh and Commons routes, A carves a marked channel or opens **G**, Y runs 60 water steps, and X returns to the district. The board displays the route, gate, inlet percentage, edits used and a next-step prompt.

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
    "type": { "type": "string", "enum": ["keydown", "keyup"] },
    "key": { "type": "string" },
    "save": { "type": "string" },
    "reset": { "type": "boolean" },
    "confirmed": { "type": "boolean" },
    "resetId": { "type": "string" }
  },
  "additionalProperties": false
}
```

### Example

```json
{ "actions": ["right"] }
```

## Output

The toy returns the shared pixelated 160×144 frame, world snapshot, current objective, journal and drawable canvas shapes. A completed choice appears in the district status and charter state.

### Example

```json
{
  "type": "the-commons-of-tomorrow",
  "width": 160,
  "height": 144,
  "pixelated": true,
  "quest": "The River Keeps Its Own Time",
  "shapes": [
    {
      "type": "rect",
      "x": 0,
      "y": 0,
      "width": 160,
      "height": 144,
      "fill": "#182f36"
    }
  ]
}
```

## Behavior

The opening scene is an early flood in Canopy Commons. June’s meal crates are staged beside the low path, and June and wetland steward Elian are both nearby: June wants to keep the weekly gathering connected; Elian asks that the nesting reeds be left undisturbed. Inspect the flood marker and talk to both neighbors before following the path east to the Living Weir. The marker and conversations are recorded in the journal; conversations are perspectives, not clues. Inspect the old gauge near the reed beds for the evidence required by the seasonal agreement.

At the flow board, the visual key distinguishes bedrock (`#`), cuttable channels (`<>`), and flowing water (`~`); the spring, gate and inlet have their own motifs. Route water to the **IN** tile: press **B** until the status says **COMMONS**; from the starting selection marked **8**, press **LEFT**, then **DOWN** to select **12** and press **A** to carve it. Press **RIGHT** twice to select **G**, press **A** to open the gate, then press **Y** until the inlet fills. The board’s next-step line and inlet percentage show your progress. Once it says **PUZZLE SOLVED · INLET FILLED**, press **X**; the next prompt points you west to the footbridge to choose an agreement. If you use all three edits without opening channel 12, press **X** to return, then open **X → Actions → Reset the flow board** to try again. The three choices have distinct marsh, crossing and gathering consequences. Visit the charter table in Canopy Commons to record the terms.

You can use basic Repair at the seasonal footbridge before the agreement: open X → Actions and choose Repair with A, or face the bridge and press B if Repair is assigned. This stabilizes the handrail while leaving the crossing closed. After recording an agreement, choose one practice from X → Practices; **Living Repair** adds the reversible repair proposal. The clue counter tracks inspected evidence: the early flood mark, old gauge, reed nesting marks, and a completed water route. Conversations reveal residents' values and are recorded separately from clues. Survey, Repair, and Listen explain their target or practice requirements when needed. Local save slots and import/export are available from X → Save options on the dedicated page. Save data belongs only to this game; no cloud account or network clock is used.
