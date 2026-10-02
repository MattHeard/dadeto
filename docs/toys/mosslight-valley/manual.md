# MOSS1 — Mosslight Valley: The Sleeping Valley

## What this toy does

Explore the opening of an original handheld-style RPG chapter. Walk the village, talk to its residents, and investigate a valley whose dreams are beginning to leak into daylight.

## Input

The embedded Dadeto toy opens with a virtual keypad: use the directional pad to walk, A to talk/confirm, B to cancel or guard, SELECT to wait, and START to open the journal. Each tap advances one shared simulation step. Keyboard capture remains available as an alternate Dadeto input method. The dedicated game page also supports keyboard, gamepad, and the same handheld-style touch controls.

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
    "save": { "type": "string" }
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
- `mosslight_act({"actions":["right","up","interact"]})` submits 1–32 sequential
  button presses. Each press uses the normal simulation, including collision and
  story rules, and receives a release tick before the next press. Repeated actions
  therefore work for dialogue, farming, and combat. Read the returned state before
  planning the next batch; action batches are not transactional story rollbacks.
- `mosslight_export_save({})` returns a portable serialized `save` string.
- `mosslight_import_save({"save":"..."})` replaces current progress with a valid
  exported save, persists it locally, and redraws. Export first to retain progress.

Use `up`/`down` and `confirm` for dialogue choices. In battle, `confirm` attacks,
`special` uses a skill, and `guard` defends. `farm`, `fish`, `rest`, `wait`, and
`journal` use the same rules as keyboard and touch controls. Invalid batches and
imports leave game progress unchanged.

Agent actions and successful imports pause automatic ticking, so observing the
game does not consume turns. The page's **Resume** button returns control to human
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

Movement, conversations, flags, maps, and frame output are deterministic. The embedded scene is replayable; the full page stores progress in local save slots and supports save import/export. Controls: arrows/WASD move, Z/Enter or E talk and confirm, F farm, Q fish, T wait, R rest, J journal, C guard, and V skill. Full-page phones use the on-screen D-pad, A/B, SELECT/START, and farming, fishing, and skill actions. Sound is optional.
