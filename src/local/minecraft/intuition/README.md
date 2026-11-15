# Intuition Engine: first live collaboration slice

Canonical [behavioral specification](https://app.notion.com/p/419700afc30181f18928c598cb9653bc).
[Source snapshot](spec.md) records the requirements inspected on 15 November 2026.
Notion remains canonical. Implementation task: `dadeto-nnwt`; existing house:
`dadeto-g37s`.

This adds generic, live, named objects to the existing Paper plugin. Codex turns
a conversation into a JSON scene request on Lorandil; the plugin applies it while
players remain connected. There is no topic whitelist, model API, new service,
client mod, resource-pack download or cloud simulation. This is a foundation for
the specification, not the complete Ship of Theseus experience.

## Player controls

Join **Dadeto LAN** and use `/intuition` to enter the lab. Fly using ordinary
Minecraft controls; the adventure-mode lab preserves your original inventory,
position and abilities in a durable return snapshot. Aim at an object within 12
blocks and use an empty hand, or `/intuition inspect`, to read its meaning and
whether it represents a metaphor, assumption, simulation, historical claim or
speculation. `/intuition leave` restores your saved state. Leaving/rejoining
resumes a lab visit; `/tabletop` still opens the house's overhead views.

The lab is beside the house in the existing owned dimension. The house retains
its 2x2 Minecraft blocks per 5-foot square scale. Lab coordinates are x=96..159,
z=0..63, y=64..95. Player flight can travel beyond the editing area; generated
edits cannot. The house, survival world, allowlist and Geyser authentication
remain separate from scene requests.

The plugin needs installation during a stopped-server update. Once installed,
scene requests, inspection, revisions, cancellation and undo do not restart the
server or require reconnecting. A server restart can still require fully closing
and reopening Minecraft because of the existing Switch LAN-session cache.

## Codex/operator controls on Lorandil

Run these from the repository; the data folder defaults to
`$XDG_DATA_HOME/dadeto/minecraft` (or `~/.local/share/dadeto/minecraft`).
`MINECRAFT_DATA_DIR` overrides it. The transport uses only Python's standard
library. Private files are under the existing private server data directory.

```bash
python3 src/local/minecraft/intuition/intuition.py context
python3 src/local/minecraft/intuition/intuition.py submit /absolute/path/scene.json --preview
python3 src/local/minecraft/intuition/intuition.py submit /absolute/path/scene.json
python3 src/local/minecraft/intuition/intuition.py undo
python3 src/local/minecraft/intuition/intuition.py cancel
```

Read current context before planning. It contains the revision, online players'
positions, view angles and aimed-at blocks/semantic object IDs, current object
meanings, timestamp and job progress. Context updates every two seconds and the
transport rejects context older than ten seconds. If a completed request races
with the next context update, wait for the revision to update before submitting
again; stale revisions are rejected without edits.

For “here”, ask the player to aim at a block, read the target and confirm the
intended object when ambiguous. `submit FILE --at-player .VocableRecord50`
translates relative box coordinates so [0,0,0] is **above** the aimed-at block.
It requires an online player aiming at a block in the lab. It does not infer the
side face or interpret all deictic language automatically. Preview the translated
request before a substantial change. Codex remains responsible for asking about
ambiguity and explaining the proposed representation.

```json
{
  "version": 1,
  "id": "example-one",
  "revision": 0,
  "action": "put",
  "object": {
    "id": "idea",
    "title": "A replaceable component",
    "kind": "metaphor",
    "explanation": "A physical stand-in for one part of an argument. Its material is not proof of the argument.",
    "relatesTo": [],
    "boxes": [
      { "from": [120, 66, 28], "to": [121, 66, 29], "material": "oak_planks" }
    ]
  }
}
```

`put` replaces the complete description and block set of one stable object ID.
Omitted old cells become air. Empty `boxes` removes the visible representation
while retaining its semantic record. `relatesTo` references existing object IDs
(or itself). All relationships, meanings and blocks persist. This protocol does
not decide whether the explanation is true: the author must choose an honest
category and cite/qualify substantive historical or scientific claims.

Undo submits `{"version":1,"id":"unique-undo-id","revision":N,"action":"undo"}`.
It restores the last committed edit's blocks **and** meanings, increments the
revision and is itself reversible; undoing an undo acts as redo. It is not a
cursor through an unlimited undo stack. Every request ID is single-use. Requests
are serialized; do not queue several requests against the same revision.

The server console also supports `intuition status`, `verify`, `selftest`,
`cancel`, `visit <exact online name>` and `return <exact online name>`. Admin
controls require the existing DM permission; ordinary players can visit, inspect
and leave. Keep console sessions open and detach with Ctrl-P/Ctrl-Q. **Do not
pipe a one-shot command into `podman attach`: closing stdin can permanently
close the running server's command input until its next restart.**

## Limits, lifecycle and recovery

- Requests are at most 64 KiB, 128 non-overlapping boxes and 4,096 expanded cells.
  The lab holds at most 64 semantic objects and 8,192 owned cells. These bounds
  keep this first slice suitable for the Pi; larger experiences need measured
  changes rather than silently removing limits.
- Coordinates must be integers inside the lab. Only the explicit inert vanilla
  palette in `SceneModel.MATERIALS` is accepted. No commands, NBT, scripts, mobs,
  block entities, fluids or arbitrary downloads can be submitted.
- Cross-object overlap, stale revisions and edits to occupied/unowned cells are
  rejected before mutation. An existing object's actual blocks must still match
  its record. Undo similarly refuses an external edit instead of erasing it.
- A write-ahead `pending.json` records old/new blocks and semantic states before
  edits. Application runs at most 100 cells and a soft two-millisecond budget per
  tick; one block/chunk operation can exceed that budget. JSON file work uses a
  single background worker. A chunk save at transaction completion remains a
  synchronous persistence boundary; occupied-server performance needs observation.
- Results transition through accepted and completed/rejected/cancelled files;
  context and in-world messages/action bars expose progress. Cancellation rolls
  back completed partial edits. A request already committing must finish; use
  undo afterward. A timed-out client must inspect results before retrying.
- Startup rolls an incomplete journal back, or finalizes a committed journal's
  result. Unexpected third-party block changes stop recovery and preserve the
  journal for inspection. This protects process restarts; it is not a guarantee
  against storage corruption or sudden power loss.
- Files: `intuition/{state,context,pending}.json`, `inbox/`, `results/`, `history/`
  and `visitors/<uuid>.yml` under `plugins/DadetoTabletop`. Existing whole-data
  backups include these. Keep recovery files and the plugin until visitors have
  returned. Do not manually edit state while running. Request/history retention
  is manual in this first slice; archive only with the server stopped.

## Verification and remaining acceptance

```bash
bash src/local/minecraft/build-tabletop.sh
python3 -m unittest discover -s src/local/minecraft/intuition -p 'test_*.py' -v
python3 src/local/minecraft/intuition/check_live.py
npm run check
```

The build includes protocol checks against the actual Java parser. The live
harness is explicitly opt-in and requires an **empty revision-0 lab**; it creates,
revises and undoes a sample, rejects stale/overlapping/out-of-bounds requests, and
cancels a large partial edit. Do not reset a populated scene to rerun it. Console
`intuition verify` checks recorded cells; `tabletop verify` must still show zero
mismatches across 33,672 house placements. Recorded results belong in Beads and
the agent note; local fast checks do not establish full CI coverage.

Requirement coverage for this slice:

| Specification outcome          | Implementation / remaining evidence                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live collaboration             | Generic request inbox, spatial context, live revisions; actual Switch connected-session observation required                                      |
| Persistent meaning             | Stable IDs, explanations, epistemic categories, relationships, inspection, restart recovery                                                       |
| Meaningful player intervention | Inspection available; generic state/action rules and consequence tracking remain a following slice                                                |
| Theseus end-to-end             | Harbor/ship can be authored as ordinary objects; plank replacement, reconstruction, guide and identity challenge acceptance remain                |
| Novel concept transfer         | No topic-specific engine code; a second unfamiliar interactive experience still needs implementation and demonstration                            |
| Rich NPCs/multiplayer          | Shared objects and messages available; NPC goals/routines/dialogue, richer collaboration and child-facing evaluation remain                       |
| Correctability/resilience      | Revision checks, ownership, progress, cancellation, reversible last edit and journal recovery; occupied-session responsiveness remains to observe |

Keep the canonical spec **Partial / Active** until the full behavioral outcomes
are demonstrated. A recognizable ship alone does not satisfy the thought
experiment or generality acceptance criteria.
