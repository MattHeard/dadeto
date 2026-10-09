# MOSS1 — Mosslight Valley: The Sleeping Valley

## What this toy does

Explore the opening of an original handheld-style RPG chapter. Walk the village, talk to its residents, and investigate a valley whose dreams are beginning to leak into daylight. Play the standalone game at [/mosslight-valley/](/mosslight-valley/).

## Input

Use only directions and A/B/X/Y on keyboard, gamepad or either virtual keypad. A talks, uses objects and confirms. X opens the menu or closes an overlay. Y opens the B assignment list: choose with directions, then A to assign. B performs that shortcut in the world and goes back in menus/dialogue. Its default is fishing (singing in battle). No START, SELECT or extra keys are needed or recognized.

X → Actions exposes farming, fishing, crafting, tea, waiting and resting; in battle it offers attack, song, guard, memory and tea. X also opens the journal, story/help, inventory, pause and save options. Use directions to select and A to enter; B goes back and X closes. Save options include all three slots, export/import and a two-step reset confirmation. Assignments are saved with progress.

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
    "actions": { "type": "array", "items": { "type": "string" } },
    "type": { "type": "string", "enum": ["keydown", "keyup"] },
    "key": { "type": "string" },
    "save": { "type": "string" },
    "reset": { "type": "boolean" },
    "confirmed": { "type": "boolean" },
    "resetId": { "type": "string", "minLength": 1 }
  }
}
```

## Agent play through WebMCP

Open `/mosslight-valley/` in a browser that exposes `document.modelContext`.
The dedicated page registers four tools connected to the same runtime and save
slot that the player sees. The generic `run_toy` tool still rejects games;
navigate to the dedicated page for direct play.

- `mosslight_observe({})` returns full structured game state, including the map's
  blocked cells and exits, player/NPC coordinates, dialogue and choices, battle
  state, inventory, relationships, flags, journal, and supported actions.
- `mosslight_act({"actions":["right","up","a"]})` submits 1–32 sequential
  button presses. Each press uses the normal simulation, including collision and
  story rules, and receives a release tick before the next press. Repeated actions
  therefore work for dialogue, farming, and combat. Read the returned state before
  planning the next batch; action batches are not transactional story rollbacks.
- `mosslight_export_save({})` returns a portable serialized `save` string.
- `mosslight_import_save({"save":"..."})` replaces current progress with a valid
  exported save, persists it locally, and redraws. Export first to retain progress.

Agent play uses only `up`, `down`, `left`, `right`, `a`, `b`, `x`, and `y`, just
like physical controls. Use `x` then directions and `a` for all actions and
menus; `y`, directions and `a` assign the `b` shortcut. Invalid batches and
imports leave game progress unchanged.

Agent actions and successful imports pause automatic ticking, so observing the
game does not consume turns. A controller button returns control to human
play. Read-only observations and exports do not change the game. Tools are removed
on page teardown when supported, and stale callbacks reject even in browsers
without tool unregistration. Browsers without WebMCP keep normal gameplay.

## Output

Returns a 160×144 pixel-art frame payload rendered by Dadeto's canvas presenter. The dedicated page uses the same frame and simulation modules.

### Example

```json
{
  "type": "mosslight-valley",
  "width": 160,
  "height": 144,
  "pixelated": true,
  "mode": "world"
}
```

## Behavior

Movement, conversations, flags, maps, and frame output are deterministic. The embedded scene is replayable; the full page stores progress in local save slots and supports save import/export. Controls: arrows move, A talks/confirms, B uses an assigned action or goes back, X opens/closes menus, and Y assigns B. All gameplay actions are available through these menus. Sound is optional.

## Start over

Open X → Save options on either keypad. Choose the slot, then Reset current slot. The confirmation defaults to Keep my progress. Choose Erase this slot and press A only when you are sure; B or X cancels. Export first if you want a backup.

Confirming immediately overwrites only that slot with a brand-new adventure: memories, relationships, inventory, crops, dialogue, battles, endings and B assignment are reset. Other slots and other toys' data are preserved. An exported backup can restore the old adventure; without one, overwritten progress cannot be recovered.

The shared runtime exposes `runtime.resetSave()`. A synchronous embedded request must explicitly include `reset: true`, `confirmed: true`, and a fresh nonempty `resetId`. The keypad generates this identifier after confirmation. Consumed reset identifiers are recorded separately from adventure state, so repeated polling, reloads or old commands cannot erase later progress. Unconfirmed or unidentified resets do not advance or erase the game.
