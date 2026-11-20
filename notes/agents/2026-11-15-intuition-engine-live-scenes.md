# Intuition Engine: live collaboration foundation

Task `dadeto-nnwt`; canonical behavioral spec
<https://app.notion.com/p/419700afc30181f18928c598cb9653bc>. Snapshot and protocol:
`src/local/minecraft/intuition/`. Preserve the existing house task `dadeto-g37s`.
Notion is marked Partial / Active, not Implemented. Following slices are
`dadeto-86l4` (generic interventions and complete Theseus) and `dadeto-e5rj`
(novel-concept transfer). Actual connected Switch observation remains required.

## Design and evidence

Inspected the existing Pi5 ARM64 Paper26.3/Geyser/Floodgate stack, 1200MB JVM,
rootless Podman, installed libraries and private data directory. Reused the
existing plugin/world ownership and inventory return snapshots. Gson is already
in Paper's libraries; no new download, model service or infrastructure was added.

A generic object request has stable ID, revision, meaning, epistemic category,
relationships and inert vanilla block boxes. File ingestion and persistence use a
single background worker; block edits are serialized and bounded per tick.
A pre-edit journal, actual-block ownership checks and last-edit undo cover both
blocks and semantic state. Player context exports positions/aimed-at blocks;
empty-hand interaction inspects meanings. Lab visit and return reuse durable
player snapshots; house cameras remain available. All generated edits stay
within x96..159/z0..63/y64..95, away from the house.

Executed evidence:

- `bash src/local/minecraft/build-tabletop.sh`: PASS, including actual Java
  parser checks in `SceneModelCheck` against the installed Paper dependencies.
- `python3 -m unittest discover -s src/local/minecraft/intuition -p 'test_*.py' -v`:
  3/3 PASS (complete atomic publication, duplicate/path/size rejection, stale
  spatial context).
- `python3 src/local/minecraft/intuition/check_live.py`: PASS on initially empty
  live lab. Create, revise material and meaning, undo both, reject stale/overlap/
  out-of-bounds edits, cancel and roll back a 4096-cell partial job. Results:
  `reports/intuition/live-check.log`.
- Restart persistence/recovery: supplied a valid incomplete four-cell journal
  against saved revision3, restarted, observed cancelled/recovered result and
  exact pre/post `state.json` SHA256 equality. This fixture was **before block
  mutation**: a preliminary console `setblock` used the default world and was
  refused. Do not report a partially-applied crash fixture; running cancellation
  separately tested partial rollback.
- Seven ordinary harbor/ship object requests completed live, revision3 to10,
  eight objects including the retained reversible-plank acceptance sample.
  `intuition verify`: zero mismatches at revision10.
- `tabletop verify`: zero mismatches across all33,672 original house placements
  both before and after the new scene, including restart. Existing authentication
  and LAN discovery loaded normally. No real player was online for these tests.
- `mspt` after scene generation: one-minute average0.8ms, maximum161.2ms;
  idle five-second average0.1ms/max0.4ms. This is **not** occupied-session or
  device continuity evidence. The final chunk-save boundary remains synchronous;
  a soft block-edit budget does not bound all prevalidation/chunk/save work.
- Required local `npm run check` and current-head full CI are recorded separately
  in the bead/PR once terminal; do not infer their outcome from this note.

The harbor contains no Theseus-specific Java logic. It is a scaffold for the
thought experiment, with inspectable meanings; automatic component replacement,
original-material reconstruction and a conversational philosopher remain pending.
No familiar scenario establishes novel-concept transfer by itself.

## Hurdles and next-time guidance

A one-shot pipe to `podman attach` closes the running server's stdin at EOF.
The console then echoes input without executing it; inspecting `/proc/<pid>/fd/0`
showed `/dev/null`. A controlled restart restored a pipe and normal commands.
Use a persistent console and detach with Ctrl-P/Ctrl-Q; do not pipe commands.
The required installation restart was done with zero online players and a
whole-data backup; scene generation itself uses no restart.

Use waxed copper in the inert palette: ordinary copper oxidizes and would eventually diverge from recorded ownership without a player edit. The parser check preserves this guard.

Paper warns about manual world saves with autosave enabled. Keeping a save before
semantic commit favors restart consistency for this slice; measure occupied
sessions and improve this boundary if delays are visible. Do not remove the
journal or claim a hard two-millisecond end-to-end guarantee. A world conflict
stops further edits and retains recovery evidence rather than guessing.

Live check fixtures assume revision0 and are opt-in. Do not erase a populated
lab to rerun them. The example requests preserve the actual first deployment's
revisions3..9; for another session choose new request IDs and current revisions.
Keep scene history and player return snapshots in existing whole-data backups.
