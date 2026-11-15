# Iron Man building companion

Iron Man follows `.VocableRecord50` on Lorandil. He is a native Paper mannequin
with a bundled red/gold skin delivered to Bedrock through Geyser, hovering
thrusters, a survey beam and a construction beam. He settles about 3.5 blocks
ahead and to your right, and holds that station when you turn to inspect him.
He relocates if you move more than 5.5 blocks away, come within 1.5 blocks,
change worlds or obstruct his space. His local follower checks every
two ticks and removes or relocates him if he would exceed 16 blocks. Teleports and
world changes resynchronize him. No owner online means no entity or model calls.
There is no combat automation.

Talk to him in Minecraft chat:

- `Iron Man, what should we build here?` starts a private conversation.
- `/ironman chat could you suggest a castle entrance?` does the same through a command.

He responds with an inventive, confident, dryly witty Iron Man-inspired voice and
remembers the last six exchanges across controller restarts. Replies are short
for handheld reading. Conversation works during previews/builds; chat never changes
blocks. Only the assigned owner can use natural addressed chat; ordinary messages
stay ordinary server chat. Use the explicit building commands to apply a plan.

Point at an empty worksite and use Minecraft chat:

- `/ironman preview build a small oak archway` asks for a holographic blueprint.
- `/ironman confirm` builds the preview.
- `/ironman build build a three-wide, three-high oak wall` previews for two seconds,
  then builds. A model may still choose preview instead.
- `/ironman revise remove the top row of your wall` can change only blocks still
  matching Iron Man's ownership record. Point at the appropriate origin again.
- `/ironman cancel` cancels pending requests and rolls back the active build.
- `/ironman undo` restores the last completed job. Keep the worksite nearby.
- `/ironman off`, `/ironman on`, `/ironman follow`, `/ironman status` control presence.

Commands are restricted to the assigned owner or an operator. Every block center
must be within a 16-block sphere of the owner when accepted and when placed. Each
job has at most 32 non-overlapping boxes / 1024 blocks. The palette contains inert
building blocks, stairs, slabs and lighting. No containers, NBT, entities, fluids,
commands, explosions or inventory changes are generated. Builds fill air; revisions
can replace only matching owned cells. Builds pause if players stand in the target
cells, the owner moves away, changes worlds, dies or leaves. Existing external
edits stop the job rather than being erased. No chunks are forced loaded.

Block states are canonicalized before journaling, including stairs/slab defaults.
The journal is written before edits; completion saves the world before committing
the ownership record. An unfinished journal rolls back on restart when the owner
returns near the worksite. Ownership/history survive restarts; only the most recent
completed build is undoable. The ownership ledger is capped at 16,384 cells.
A disk failure disables building until recovery on restart; inspect the server log.
The service/controller files are private runtime data, not a public endpoint.

## Install and operate

The native plugin requires this server's Paper 26.3 and pinned Geyser LAN build.
The build uses the existing pinned JDK container and existing Paper/Geyser jars:

```sh
bash src/local/minecraft/build-ironman.sh
python3 -m unittest discover -s src/local/minecraft/ironman -p 'test_*.py'
bash src/local/minecraft/ironman/check-skin.sh
```

While no players are connected: stop with `minecraft.sh stop`, take a
`minecraft.sh backup`, install `ironman/build/DadetoIronMan.jar` into the existing
data directory's `plugins/`, then start with `minecraft.sh start`.
Do not regenerate or reset the existing tabletop/intuition scenes.

```sh
python3 src/local/minecraft/ironman/install_brain.py
systemctl --user status dadeto-ironman-brain.service
journalctl --user -u dadeto-ironman-brain.service -n 30
```

`MINECRAFT_DATA_DIR` selects a different data directory for both build and installer;
the installer captures that directory in the unit. The service runs automatically
with the existing lingering user manager, including after login/reboot when the
Minecraft server is available. It does not start the Minecraft server itself.

The installer checks the official Codex 0.169.0 ARM64 archive checksum in
`runtime.env` and installs it separately under `~/.local/share/dadeto/ironman-tools/`.
It preserves the desktop/global CLI. It uses the existing ChatGPT Codex login,
explicitly requests `gpt-6-luna` with reasoning `low`, removes API-key environment
variables and rejects non-ChatGPT login. No alternative model/provider or API
billing fallback is configured. Apps, plugins, browsing and shell tools are disabled;
model output is constrained JSON and validated again by the server.

The controller thinks on owner arrival, at most once every two minutes when idle,
and on explicit building or conversation requests. Deterministic local following continues between
model calls. Errors pause model retries for five minutes. Diagnostics and the last
six intentions/results are private files under `plugins/DadetoIronMan/`. Building
plans are intentions, not evidence of completion; `results/` records application.

`/ironman selftest` from the server console requires zero players. It first verifies native spawn, owner teleport, world change, the distance guard
and removal using an offline fixture that loads its test chunks normally. It then checks an
empty reserved worksite at tabletop (148,84,4), then verifies preview, nine-block
construction, existing-block protection, undo and pending-journal recovery, ending
with the worksite restored. It uses a separate `selftest/` ownership/journal directory.
Look for terminal `PASS IronMan integration` in the server log. It refuses occupied
space; never clear it just to make the check pass.

## Client acceptance boundaries

A real GPT-6-Luna/low ChatGPT probe produced a bounded 3x3 oak wall decision.
Server tests do not establish Switch rendering or controller usability. On the next
Switch visit, check the red/gold skin, hover/follow within 16 blocks, a preview and
confirm/undo. `context.json` records skin deliveries and maximum observed follower
distance. Java clients currently use a vanilla profile fallback; the custom texture
is injected specifically for Bedrock clients. Skin art is compiled deterministically
from classic Minecraft UV face grids in `make_skin.py`.

The skin compatibility check requires the existing pinned Geyser build checkout
and cached dependencies from build-lan-geyser.sh. It exercises Geyser's real
profile gate with the bundled profile.json, confirms the reserved Floodgate
placeholder is rejected, and checks opaque base UV regions. The old placeholder
was reachable over HTTP but deliberately bypassed SessionSkinApplyEvent. Do not
reuse it as a mannequin bootstrap. The first matching custom-skin hook application
is logged; context.json's skinPackets counts overrides, not client rendering.

To reproduce the exact server skin preview (optional Pillow and DejaVu Sans):

```sh
python3 src/local/minecraft/ironman/render_skin.py src/local/minecraft/ironman/build/ironman.png reports/ironman/iron-man-preview.png
```

This projects the actual UV pixels onto a wide Minecraft model, with front and
three-quarter views. It does not synthesize or repaint the skin.
