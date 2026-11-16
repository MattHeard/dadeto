# Native connected hub/spoke worlds

Owner: dadeto-fkwg. User requests ordinary survival plus commands to visit other
worlds without disconnecting. Reuse the current survival save/Nether/End and the
existing house/lab. Add only owned hub/workshop worlds with separate profiles.

The existing ViewerState atomic YAML snapshot already protected inventories,
mode/flight and position. It did not capture vitals/XP/ender/respawn, allowing a
peaceful display visit to affect survival. Added versioned captureFull/restore
extras and reused that in both existing activities and the new WorldProfile.
Legacy capture/load checks still pass. HubWorlds unwinds existing activity returns
before switching profiles, so nested command paths do not save a viewer kit as
survival inventory. Creative/hub portals and unmanaged cross-group teleports are
blocked; normal survival Nether/End are one group. Default arrival is hub, with a
live operator toggle so migration can stay disabled until acceptance passes.

Native HubCheck passed round trips and named inventory/armor/offhand/ender/XP,
vitals/effects/respawn, exact last position/orientation, full viewer snapshots,
creative state persistence, refused-teleport rollback, double-failure retained
journal/freeze, restart recovery and vanilla Nether sharing. It uses a synthetic
player and separate selftest files. Existing viewer/scene/house and companion
integration also passed. Expected source artifacts: reports/minecraft-hub/build.log,
ironman-build.log, controller-tests.log and integrity.json. No reset of real progress.

An initial optional save-fingerprint check assumed the older world/playerdata path.
Paper26.3 actually uses world/players/data. The outer exploratory command did not
halt after that read-only failure, although its fresh zero-player check passed and
a full stopped backup preceded installation. Corrected the durable verifier to
recognize modern/legacy layouts and fail closed; deployment procedures now state
set -euo pipefail explicitly. The actual data/stats/advancements were compared
byte-for-byte with backup20261116T084353Z and unchanged before/after native tests.
The real semantic state stayed exactly revision67; house0/33672 and scene0 mismatches.

setKeepSpawnInMemory is marked for removal in the pinned API; removed that new
call. New worlds report0 persistent chunks and no force-load tickets. Their own
marker and initialized-platform file prevent overwriting workshop edits on restart.
The new Iron Man world scope covers tick/teleport, requests/application and exported
enabled state; only build/tabletop are active. Existing controller tests remain valid.

Next time: test both activities' return snapshots, not just the new router. Do
not assume old Paper save paths or treat native player proxies as client rendering
proof. Use the native verifier with an actual pre-update archive, then perform a
real Switch round trip when the user is available. Keep transport freezes separate.

Final arrival check: normal joins use next-tick hub transfer with transient damage/
hunger protection, avoiding exposure at an old hostile survival location. Only
existing viewer returns wait for their30/40-tick recovery callbacks; that delay
is also protected. A pre-existing pending journey blocks player interaction until
recovery. Hub initialization errors without a journal do not freeze untouched
survival players.
