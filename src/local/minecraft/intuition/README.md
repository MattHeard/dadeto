# Intuition Engine: live semantic thought experiments

Canonical [behavioral specification](https://app.notion.com/p/419700afc30181f18928c598cb9653bc).
[Source snapshot](spec.md) records the requirements inspected on 15 November 2026.
Notion remains canonical. Tasks: `dadeto-nnwt` (bridge), `dadeto-86l4` (interactions/Theseus),
`dadeto-e5rj` (transfer), `dadeto-y15j` (remaining NPC depth); existing house:
`dadeto-g37s`.

This adds generic, live, named objects to the existing Paper plugin. Codex turns
a conversation into a JSON scene request on Lorandil; the plugin applies it while
players remain connected. There is no topic whitelist, model API, new service,
client mod, resource-pack download or cloud simulation. Generic interactions now support the two authored experiments below. Server
acceptance is automated; the specification still needs actual connected-user
Switch observation and deeper NPC behavior.

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

Requirement coverage after the interaction and transfer milestones:

| Specification outcome     | Implementation / remaining evidence                                                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Live collaboration        | Generic request inbox, spatial context, live revisions; actual connected Switch observation remains pending                                                                                                  |
| Persistent meaning        | Stable IDs, explanations, epistemic categories, relationships, counters, provenance and guides survive restart                                                                                               |
| Meaningful intervention   | Conditional ordinary block interactions atomically change counters, materials and reconstructed objects; controller behavior still needs observation                                                         |
| Theseus                   | Eight replaceable modeled components, originals reconstruction, state-aware fictional guide, contrasting live representation and restoration tested on the server; actual user end-to-end acceptance pending |
| Novel transfer            | Coordination payoff exhibit authored after Theseus, with unchanged Java engine; all outcomes/orderings and reward revision tested; human novel-prompt and Switch acceptance remain pending                   |
| NPCs/multiplayer          | Shared atomic rules and guide roles/topics work; physical autonomous NPC goals/routines, unrestricted NPC conversation, actual multiplayer and child-facing usability remain to develop/evaluate             |
| Correctability/resilience | Revision/ownership guards, progress, cancel, undo of geometry plus interaction state and recovery; occupied-session performance remains unmeasured                                                           |

Keep the canonical spec **Partial / Active**. Passing server tests does not satisfy
the specification's explicit requirement for an actual connected player to
complete and revise an understandable experience.

## Ready-to-play experiments

Enter with `/intuition`. Fly down to the ship. Point at a wooden deck panel and
use your empty hand once to inspect it; use it again within ten seconds to
perform its named replacement action. Duplicate packets within half a second
are ignored. Each of eight panels is replaceable once. A spruce replacement
stays on Ship A and the removed original oak component appears on Ship B,
sixteen blocks south. Progress, flags and original-material provenance persist.
The eight panels stand in for all modeled material parts; black outlines, gray
masts and white sails are explicitly decorative diagram furniture.

The gold guide near the pier offers `/intuition ask identity`, `materials`,
`continuity`, `function`, `compare` and (after all eight replacements)
`all-replaced`. Keep pointing at the guide within twelve blocks. It is an
invented interpreter, not a simulation of a historical person. Its topics
contrast criteria without declaring a disputed question settled. Other questions
can be brought to Codex for a live scene/topic revision; there is no unattended
frontier-model dialogue service.

West of the harbor is a coordination payoff exhibit. Its four gray choice tiles
let party A and party B each choose cooperation or a safer option. Touch a tile
twice to commit that choice. The resulting green columns show the stipulated
rewards. One player can explore both roles or players can agree who controls
which role. Choices are sequential and visible: this illustrates a payoff
structure rather than a controlled simultaneous-choice experiment. Its gold
guide offers `choices`, `outcome`, `risk`, `assumptions`, and `limits`.

For background on the coordination-game framing, see the primary research paper
[Ferreira, Santos and Pequito (2021)](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1009167).
The Minecraft table is our explicitly stipulated example, not that paper's model
or a claim to predict people. No actual hunting or animal harm is depicted.

Authoring tools generate ordinary generic requests, not server-side scenario
code or a fixed allowed-topic list:

```bash
python3 src/local/minecraft/intuition/theseus.py deploy --preview
python3 src/local/minecraft/intuition/theseus.py contrast
python3 src/local/minecraft/intuition/stag_hunt.py --preview
python3 src/local/minecraft/intuition/stag_hunt.py --mutual-reward 6 --preview
```

Deployment tools refuse to silently reset existing choices/progress. Preview
before authoring a deliberate counterfactual reset. Earlier `examples/` files
are historical first-deployment fixtures at revisions3..9, not replayable commands
for the current populated world. New request IDs and current revisions are
required. There is no player reset button that can erase another player's run;
Codex can author an explicit revision or the DM can undo the latest transaction.

## Generic interaction protocol

`batch` adds/revises 1..32 objects and optional `configuration` in one transaction.
All boxes together are limited to4,096 expanded cells; intermediate ownership
transfers are not exposed. `configure` merges the supplied counters, rules and
guides by ID. It does not silently delete unrelated definitions.

```json
{
  "version": 1,
  "id": "configure-example",
  "revision": 1,
  "action": "configure",
  "configuration": {
    "variables": { "changed": 0 },
    "rules": [
      {
        "id": "replace-idea",
        "trigger": "idea",
        "label": "Replace the component",
        "requires": { "changed": 0 },
        "increments": { "changed": 1 },
        "effects": [
          {
            "source": "idea",
            "target": "recovered-idea",
            "offset": [0, 0, 8],
            "title": "Recovered original",
            "explanation": "Original material moved into a comparison representation.",
            "kind": "assumption"
          },
          {
            "source": "idea",
            "target": "idea",
            "offset": [0, 0, 0],
            "material": "spruce_planks",
            "title": "Replacement",
            "explanation": "A new material occupies the old role.",
            "kind": "assumption"
          }
        ],
        "message": "Changed {changed} component; this is not a verdict about identity."
      }
    ],
    "guides": [
      {
        "object": "idea",
        "role": "A hypothetical interpreter",
        "disclaimer": "An interpretation, not a historical quotation.",
        "topics": {
          "compare": {
            "kind": "speculation",
            "text": "{changed} component changed. Which identity criterion are you applying?",
            "requires": { "changed": 1 }
          }
        }
      }
    ]
  }
}
```

Prerequisites are exact counter matches; increments may be positive or negative,
but every resulting counter must stay within0..1,000,000. Maximums are128
counters,128 rules,16 effects per rule,16 guides and32 topics per guide. A rule's
effects together may read at most4,096 source cells. Effects use the pre-action
state regardless of order. A copy can shift the source by an integer offset and
optionally override its material; it retains source provenance and relationships.
Sources must already exist, effect target IDs must be unique, final coordinates
must stay in the lab, and final object ownership cannot overlap. An invalid
transition changes neither counters nor blocks.

A private operator request can execute a rule:
`{"version":1,"id":"unique-action","revision":N,"action":"act","rule":"replace-idea","actor":"operator"}`.
Actual player requests are constructed on the server with that player's UUID,
require a lab visit and aiming at the rule's trigger object, and obey the same
revision, precondition, persistence and ownership checks. Operator-authored actor
labels are trusted local metadata, not proof that a player participated.

When one action is available, the first empty-hand use explains it and arms it;
the next confirms it. When several actions are available, the client lists
`/intuition act <id>` choices instead of guessing. Changes are serialized and
shared; a second player with a stale confirmation must inspect again. Guides
substitute counter values in `{counter-id}` placeholders and gate topics on
prerequisites. No arbitrary script or command evaluation is allowed.

The same journal/undo transaction contains objects, counters, rules, guides,
provenance and actor metadata. Existing saved scenes without interaction fields
load with empty defaults. Context now exports counters, rules, guides and
provenance alongside geometry meanings and player spatial cues.

## Extended acceptance harnesses

```bash
python3 src/local/minecraft/intuition/check_interactions.py
python3 src/local/minecraft/intuition/check_transfer.py
```

Both are opt-in tests, require no online players and refuse to overwrite an
existing player's choices. They restore the tested exhibits' starting state.
The first requires Theseus progress0, exercises all eight replacements,
128 reconstructed blocks, once-only actions, counter/provenance undo/redo and a
contrasting revision. The second requires undecided coordination roles,
exercises every payoff outcome in both choice orders, checks a reward4→6 revision,
keeps the other exhibit unchanged and verifies Java engine hashes never change
during transfer. Restart verification compares the entire saved semantic state.
Real controller interactions, simultaneous users, child-facing readability and
occupied-session responsiveness remain separate manual acceptance.

## Visible local guide characters

Two vanilla villagers now represent the harbor philosopher and coordination
guide. Their persisted semantic objects record their roles, goals, dispositions
and relationships. Knowledge and state-aware dialogue remain in the linked gold
guide markers: **use the gold marker for `/intuition ask <topic>`**, rather than
opening a villager trading interface. These are fictional guide avatars with
simple local pacing/facing routines, not free-form reasoning agents or historical
personality simulations. No model calls, client packs or new cloud services are
involved.

The small Python projection runs on Lorandil as the rootless user service
`dadeto-intuition-npcs.service`. It creates only tagged invulnerable villagers in
the lab, gives them a non-colliding team, and checks that stations have a floor
and clear feet/head space. Routes pause when no player is within32 blocks.
At most3 NPCs,8 stations each, and periods of5..60 seconds are allowed. The
worker polls at5-second intervals; this is a basic station routine, not natural
pathfinding or a frame-rate guarantee. Two chunks are kept loaded for the current
routes so saved tagged villagers can be found without duplication.

```bash
python3 src/local/minecraft/intuition/npc_guides.py deploy
python3 src/local/minecraft/intuition/install_npcs.py
python3 src/local/minecraft/intuition/npc_guides.py status
python3 src/local/minecraft/intuition/npc_guides.py stop
python3 src/local/minecraft/intuition/npc_guides.py start
python3 -m unittest discover -s src/local/minecraft/intuition -p 'test_*.py' -v
python3 src/local/minecraft/intuition/verify_npcs.py
```

The installer verifies its unit before enabling it, refuses an unrelated unit at
the same name, and copies the worker/transport into the private Minecraft data
folder. The service survives source-worktree removal and has configured10% CPU
and128MB memory caps. Its actual observed resident memory was about16MB with
negligible CPU. Lorandil already has user lingering enabled. On a server restart,
the service retries every5 seconds until fresh plugin context is available;
brief `activating` status during that delay is expected.

`npcs.json` describes routes and links to existing semantic guide objects. The
worker reloads it and current semantic state. Removing an NPC's semantic object
suspends its projection and removes only that tagged entity; restoring it permits
reconciliation. Copies of configuration/runtime and NPC entity data are included
in existing whole-data backups. The user service unit lives outside that backup;
rerun the installer to regenerate it. Semantic role changes and route changes
should be authored together deliberately. Existing experimental progress is not
reset by deployment.

Stopping the worker leaves the passive NPCs and forced chunks intact. If removing
the feature, first inspect `npcs.json`, entity tags and force-load ownership; do
not remove other entities or another system's chunk tickets. Generic scene undo
covers semantic/geometry changes; the separate NPC route configuration must also
be restored explicitly when undoing an intentional route change.

The private adapter writes bounded command lines into the existing Java stdin
pipe, while its original container writer stays open. It verifies the container
PID, `paper.jar` and pipe type, and accepts no arbitrary command input from scene
data. A real Linux child-pipe regression test proves independent writes do not
close the reader. This avoids the `podman attach` EOF failure described above.
Physical NPC spawning, UUID persistence, one-per-tag counts, route probes and
service recovery have been checked on the server. Actual Switch rendering and
readability of these new guide characters remain to observe.
