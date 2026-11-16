# Lorandil hub and connected worlds

This is one Paper server and one Java/Bedrock connection. Travel uses native
world teleports; it does not send a server-transfer packet or require reconnecting.
The LAN address, allowlist, Geyser/Floodgate login and world save identity stay the same.

| Command | Destination |
| --- | --- |
| `/hub` | Safe adventure-mode arrival island; signs also respond to Use |
| `/survival` or `/world survival` | Existing vanilla survival, at the last saved position |
| `/world build` | Separate creative workshop with Iron Man and Luna chat/building |
| `/world tabletop` | Existing Noble's House overhead views |
| `/world lab` | Existing Intuition Engine exhibits |
| `/worlds` | List destinations |

`/world hub` also works. The house and lab are two activities in the same existing
tabletop world. Their normal leave controls return to the world from which they
were entered; `/hub` or `/survival` can exit either activity directly.

The existing `minecraft:overworld`, `minecraft:the_nether` and `minecraft:the_end`
share one survival profile. Normal survival portals and respawns remain intact.
Survival is not regenerated or reset. `/survival` can return to the Nether/End if
that was the last survival location. Ordinary survival rules and mobs are unchanged.
Iron Man and the controller are scoped to the workshop/tabletop and pause elsewhere.

The new owned worlds are `minecraft:dadeto_hub` and `minecraft:dadeto_build`. They
use empty terrain with small permanent platforms; workshop flight/building is
creative. Neither keeps chunks forcibly loaded. Platforms are initialized once;
restarts do not overwrite later workshop edits. Unknown existing world folders
are refused unless their specific ownership marker matches.

## Player state

Survival, hub and workshop have separate inventories (including armor/offhand),
ender storage, XP, health, absorption, food/saturation/exhaustion, effects, air/fire
and respawn locations. Survival and workshop positions/orientations are remembered;
the hub returns to its central spawn. Leaving survival saves its real current
state, rather than resurrecting an older pre-death inventory. A dead player must
respawn before travelling. Open inventories close before capture to settle cursor items.

Tabletop/lab snapshots now preserve the same full state, so peaceful-world healing,
XP or potion changes do not carry back into survival. Legacy viewer snapshots still
restore their original captured fields. The shared player account retains global
statistics, advancements and recipes; these are worlds, not separate player accounts.

Profiles live under private `plugins/DadetoTabletop/worlds/players/<UUID>/`.
A durable `pending.yml` contains the original profile before inventory/mode/location
changes. Teleport failure restores the original state. If both travel and rollback
fail, keep the pending file: affected interactions/movement are blocked until
recovery succeeds. Rejoining recovers pending state before hub arrival. Never delete
an unresolved journal to bypass a failure. Source/target profile group and world
must match; malformed files are retained and rejected.

Creative/hub portals cannot enter the shared survival dimensions; use the travel
commands. Other direct cross-group teleports are refused so they cannot bypass
inventory separation. Operators can still modify the server deliberately; this
is state separation for normal play, not an anti-cheat system for trusted operators.

## Build, install and validate

```sh
set -euo pipefail
bash src/local/minecraft/build-tabletop.sh
bash src/local/minecraft/build-ironman.sh
python3 -m unittest discover -s src/local/minecraft/ironman -p 'test_*.py'
```

Use a fresh console `list` response to establish zero connected players before
restarting. Stop with `minecraft.sh stop`, then `minecraft.sh backup`; install both
built jars in the selected private data directory and start with `minecraft.sh start`.
Keep `hub-on-join: false` in the private Tabletop config until native acceptance passes.
Use `set -euo pipefail` for compound deployment commands so failed preflight checks
cannot silently fall through to mutations. A server restart is required for new code.

From the console, `worlds selftest` verifies real-world routes with a synthetic
player, isolated test files and no real player changes. It covers named items,
armor/offhand/ender/XP/vitals/effects/respawn, full viewer restore, position/orientation,
creative state retention, cancelled-teleport rollback, double-failure retained
journal/movement freeze, recovery after a new router instance, vanilla Nether
sharing, cross-group escape rejection and malformed file retention. It requires
no connected players and refuses an unresolved prior test journal.

For full offline preservation evidence, capture the real Intuition state before
deployment and supply the stopped pre-update backup:

```sh
python3 src/local/minecraft/tabletop/verify-worlds.py \
  --backup /absolute/path/to/pre-update-backup.tar.gz \
  --expected-scene /absolute/path/to/scene-before.json
```

The verifier handles Paper26.3 `world/players/{data,stats,advancements}` and older
layouts. It compares actual player data/stats/advancements byte-for-byte with the
backup, runs the native hub/viewer/companion checks and scene/house verification,
then proves those real player files and semantic state remain unchanged. It reads
archive members without extracting a backup over live data. Do not reset real
scene progress to make acceptance pass. `MINECRAFT_DATA_DIR` selects nondefault data.

Once acceptance passes, console `worlds join on` enables default hub arrival;
`worlds join off` disables that automatic arrival. Both require operator permission.
They preserve other configuration and do not move an already connected player.
Normal joins move to the hub on the next tick with transient damage/hunger
protection. Existing viewer returns get a protected delay so their scheduled
recovery finishes before hub travel. Dead players finish respawning first.

The native test is evidence of server state behavior, not a substitute for seeing
Switch world rendering. On a real visit, try `/hub` → `/survival` → `/world build`
→ `/survival`, check survival inventory/XP return, and confirm the connection stays
open. Client/network freezes remain a separate transport investigation.
