# Noble's House tabletop

A roofless Minecraft interpretation of the **upper, ground-floor panel** of the
user-supplied Noble's House map by MikWewa. Scale is exactly **2 × 2 Minecraft
blocks per 5-foot grid square**. All rooms are visible. The original JPEG remains
user-supplied reference material; the repository contains authored geometry.

The scene includes the music room/piano, study, central hall and stairs, common
room, red drawing-room seating, west sitting/workrooms, four beds, kitchen/pantry,
dining bay with eight chairs, and west entrance terrace. Furniture is represented
with ordinary Minecraft blocks. Walls are low cutaways and there is no upper
floor or roof.

## Viewing on Switch 2

Join Dadeto LAN. Use `/tabletop` to enter, or have the DM queue a visit from the
server console. Your previous position, mode, inventory, selected slot, flight
and gravity settings are saved before switching to the read-only overhead view.

Choose hotbar items with the controller to switch cameras:

| Slot | View                   |
| ---- | ---------------------- |
| 1    | Whole house            |
| 2    | Music room and study   |
| 3    | Hall and stairs        |
| 4    | Drawing room           |
| 5    | West sitting/workrooms |
| 6    | Bedrooms               |
| 7    | Kitchen                |
| 8    | Dining room            |
| 9    | Return to previous world|

You can also use `/tabletop view 1` through `8`, or `/tabletop leave`. The viewpoint
is fixed looking straight down; selecting a room gives a closer view for handheld
use. Building, damage, inventory edits, drops and hand swapping are disabled while
viewing. Return restores the saved inventory and location and saves player data
before deleting the recovery snapshot.

If the server restarts, fully close Minecraft from Switch HOME → highlight game →
X → Close, reopen and select Dadeto LAN if the old LAN entry fails. Existing viewer
snapshots resume the tabletop camera on reconnect. A queued visit is consumed only
after a successful entry.

## Build and install

From the repository root, with the LAN server's Java image and Paper libraries
already installed:

```bash
bash src/local/minecraft/build-tabletop.sh
bash src/local/minecraft/minecraft.sh stop
bash src/local/minecraft/minecraft.sh backup
MC_DATA=${MINECRAFT_DATA_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/dadeto/minecraft}
cp src/local/minecraft/tabletop/build/DadetoTabletop.jar "$MC_DATA/plugins/DadetoTabletop.jar"
bash src/local/minecraft/minecraft.sh start
```

The builder uses Python's standard library and the pinned Java build image. Java
compilation has no container network access. Generated jars, classes, TSV files,
manifest and SVG preview stay in ignored `tabletop/build/`.

The plugin owns the `minecraft:dadeto_tabletop` dimension, separate from the
survival dimension. On Paper 26.3 its files are under
`$MC_DATA/world/dimensions/minecraft/dadeto_tabletop/`, not a legacy sibling world
folder. Ownership markers are written to `World.getWorldFolder()`. Existing
unmarked target folders are rejected before building. The current server backup
command archives the entire data directory, including this dimension and viewer
recovery files.

Block data is parsed and bounds-checked before world edits. The builder writes
at most 1,000 placements per server tick, only within x=-12..56, z=-4..56,
y=63..70 in the owned dimension. A completed plan hash prevents rebuilding at
every startup. Explicit DM rebuilds replace only this board footprint.

## DM console controls

```text
tabletop status
tabletop verify
tabletop selftest
tabletop queue <exact-online-name>
tabletop visit <exact-online-name>
tabletop return <exact-online-name>
tabletop rebuild
```

`queue` also works while the player is offline; use the exact Floodgate-prefixed
name shown in the server join log. `verify` compares every placed block against
the authored plan. `selftest` checks named items, armor/offhand, empty slots,
selected slot, mode/abilities, location, atomic YAML reload, durable return save,
incomplete-state rejection, and refusal to edit unowned world folders, using a
synthetic player without changing real player state. Administrative commands
require `dadeto.tabletop.admin` (operator default); viewing and returning do not.

Viewer snapshots are private files at
`$MC_DATA/plugins/DadetoTabletop/viewers/<uuid>.yml`. They persist across disconnects
and restarts. Do not remove the plugin while someone is viewing: return them to
survival first. If a return fails, retain the snapshot and inspect the server log;
the plugin preserves recovery state rather than deleting it.

## Editing and acceptance evidence

`maps/nobles-house.json` records room outlines, openings, furnishings and cameras
in source-image coordinates. The reference grid is approximately 50 pixels per
5-foot square; dividing by two gives 25 source pixels per Minecraft block. The
compiler enforces the requested 2-block scale and emits deterministic, unique
placements plus a source-native SVG plan preview:

```bash
python3 src/local/minecraft/tabletop/compile-map.py reports/nobles-house
```

The SVG is a block-layout preview, not a Minecraft screenshot. Live acceptance
requires zero mismatches from `tabletop verify`, a passing `tabletop selftest`,
and an actual Switch check of overhead framing, hotbar camera selection and
return to the previous world. Keep exact results in bead dadeto-g37s.

## Live exploration

The same plugin now includes the [Intuition Engine](../intuition/README.md).
`/intuition` restores any current tabletop visit first, then opens a separate
walk/fly lab beside the house with its own durable return snapshot. `/tabletop`
returns from the lab before entering the overhead display. The scene bridge
cannot edit the house footprint or the survival dimension.

## Hub and connected worlds

See [worlds.md](worlds.md) for `/hub`, `/survival`, `/world build`, `/world tabletop`
and `/world lab`, separate survival/workshop profiles, default hub arrivals and
the offline native recovery/preservation check. New viewer snapshots also preserve
ender storage, XP, health, food, active effects and respawn position. Older snapshots
remain readable; fields that were never captured cannot be invented retroactively.
