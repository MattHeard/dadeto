# The Commons of Tomorrow — Game Version 3

The integer game version is defined in `src/core/browser/game/the-commons-of-tomorrow/version.js` and shown on the standalone page and in frame metadata. Increment it by one for every shipped game change, whether to gameplay, story, art, controls, or player-facing documentation, and add a matching entry to `CHANGELOG.md`. Keep this release version separate from the local save schema key.

## What this toy does

Explore a two-district solarpunk RPG set in Tandem, a city where material needs are met but people still disagree about what matters most. Meet neighbors in Canopy Commons and the Living Weir, inspect the river and its infrastructure, then help record a community agreement. The standalone handheld is at [/the-commons-of-tomorrow/](/the-commons-of-tomorrow/). Both modes share the same deterministic game and independent save slots.

The main quest, **The River Keeps Its Own Time**, asks whether to restore the marsh, rebuild the shared crossing, or use the old gauge to make a seasonal pact. Agreements change the journal, district status and charter. There is no combat, currency score or alignment meter.

## Input

Keyboard, gamepad and virtual keypad use the directions plus A/B/X/Y. In the world, A talks to or inspects the feature directly ahead; nearby people and features show a short prompt. Sola is marked by a yellow chevron, backpack and facing indicator. Follow the pale stone path east from Canopy Commons to the WEIR sign. In the Living Weir, the narrow footbridge is just west of the flow board near the entrance. Walk up to the physical flow board, face it and press **A** to begin the river trial. The maintenance panel beside it resets the trial: face the panel, press **A**, and confirm **Reset the flow board**. The habitat scope beside the reed island plays its soundscape after learning Habitat Listening. Face the footbridge to talk through routine handrail repair before the district decides whether to reopen it. X opens a compact menu for the journal, practices, charter and save options; Y opens **Assign an action to B**, and B performs the assigned action. Assignment stores the action and returns to the map; it does not perform it. In menus, A confirms, B returns to the previous menu (or closes the main menu to the map), and X closes the menu to the map. Ordinary A interactions are Survey: talk to residents, inspect evidence, use the flow board, or operate a nearby fixture. **Assign an action to B** stores Repair or Listen for later use with B. On the flow board, the goal is to route water into **IN**: arrows move the highlight, B switches between Marsh and Commons routes, A carves a marked channel or opens **G**, Y runs 60 water steps, and X returns to the district. The board displays route, gate, inlet progress, edits and its next step.

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

At the flow board, the visual key distinguishes bedrock (`#`), cuttable channels (`<>`), and flowing water (`~`); the spring, gate and inlet have their own motifs. Route water to the **IN** tile: press **B** until the status says **COMMONS**; from the starting selection marked **8**, press **LEFT**, then **DOWN** to select **12** and press **A** to carve it. Press **RIGHT** twice to select **G**, press **A** to open the gate, then press **Y** until the inlet fills. The board’s next-step line and inlet percentage show your progress. Once it says **PUZZLE SOLVED · INLET FILLED**, press **X**; the next prompt points you west to the footbridge to choose an agreement. If you want another attempt before recording the agreement, use the maintenance panel beside the board. The three choices have distinct marsh, crossing and gathering consequences. Visit the charter table in Canopy Commons to record the terms.

Tomas can help stabilize the seasonal footbridge handrail through his conversation. The basic repair leaves the crossing closed. After recording an agreement, choose one practice from X → Practices; **Living Repair** adds the reversible repair proposal. The field journal tracks inspected evidence: the early flood mark, old gauge, reed nesting marks, and a completed water route. Conversations reveal residents' values and are recorded separately from evidence. Habitat Listening unlocks the soundscape at the habitat scope. Local save slots and import/export are available from X → Save options on the dedicated page. Save data belongs only to this game; no cloud account or network clock is used.
