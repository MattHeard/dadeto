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
