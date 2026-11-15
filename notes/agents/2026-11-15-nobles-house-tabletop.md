# Noble's House ground-floor tabletop

Owning bead: dadeto-g37s. The user supplied a two-floor image and requested the
ground floor (upper panel), handheld bird's-eye viewing, no hidden rooms, and
exactly 2x2 Minecraft blocks per 5-foot square. The visible source grid is about
50px per square, giving 25px per block. Authored geometry and furnishings are in
src/local/minecraft/tabletop/maps/nobles-house.json; the source JPEG is not copied
into repository assets. Attribute the reference to MikWewa.

The scene is a roofless block interpretation with low walls, recognizable room
layout, piano, red seating/rugs, four beds, kitchen/pantry, dining table and west
porch. The compiler emits 33,672 unique bounded placements (9,181 non-air), an SVG
layout preview, eight overhead camera presets and a deterministic plan hash.
Repeated compilation produced identical TSV output. An authored preview PNG was
rendered separately for visual inspection; it is not a client screenshot.

Unexpected hurdles:

- Modern gamerule constants live in GameRules, while deprecated aliases remain
  in GameRule. Reading class-string names was insufficient; installed-API javap
  resolved the exact declarations after the first compile failed.
- Paper26.3 stores the custom dimension under world/dimensions/minecraft/, not a
  legacy top-level world directory. Initial world creation succeeded but writing
  the assumed ownership-marker path failed before any map placements. Use
  World.getWorldFolder() for the actual marker and guard both legacy/modern
  existing target folders. Only the just-created empty task-owned dimension was
  marked manually during diagnosis; unrelated worlds are rejected.

The corrected plugin built the dedicated dimension successfully. Live
`tabletop verify` reported 0 mismatches across all 33,672 placements.
`tabletop selftest` passed real Paper YAML/item serialization with a synthetic
player, including named items, armor/offhand/null slots, copied item quantities,
mode/slot/flight/gravity/location, snapshot reload, durable-save ordering,
incomplete-state retention and unowned-world rejection. No real player was
modified by selftest. A visit was queued for the user's exact Floodgate name.

Viewer return state is captured before replacing inventory, written atomically
under the external plugin data directory, and retained across disconnect/restart.
The last hotbar item restores original state and saves player data before removing
the snapshot. Avoid PlayerLoginEvent listeners: the earlier LAN investigation
found that they disable Paper's reconfiguration APIs. This plugin uses join and
item-held/move events instead.

Runbook and recovery procedure: src/local/minecraft/tabletop/README.md. Actual
Switch framing/hotbar/return observations and final local/full-CI results belong
in the owning bead. Do not equate an SVG preview or Java compile with that
cross-client evidence.
