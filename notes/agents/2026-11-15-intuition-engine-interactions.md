# Intuition Engine: interactions and data-only transfer

Tasks: `dadeto-86l4`, `dadeto-e5rj`; canonical spec remains Partial / Active.
The user explicitly asked to keep developing without waiting for Switch input.
Do not interpret automated actor labels as device or human acceptance.

## Changes and evidence

Added topic-independent conditional rules, exact-match counters, bounded deltas,
pre-state material/copy/offset effects, source provenance, conditional fictional
guide topics and atomic object batches. These reuse the existing live journal,
undo, cancellation, ownership, player snapshots and request transport. Player
empty-hand interaction first explains/arms an action and then confirms it;
revision checks prevent stale multiplayer confirmations. A half-second guard
filters repeated interaction packets. Actual controller usability is unverified.

Authored Theseus as ordinary data: eight analogous material components,
reconstruction of original material on Ship B, state-aware guide interpretations,
and a live contrasting representation. Decorative silhouettes/masts/sails are
explicitly outside the modeled material accounting. There is no claim that
counting blocks settles personal or artifact identity.

Executed:

- `bash src/local/minecraft/build-tabletop.sh`: PASS, including existing scene
  parser guards and new conditional-action, original-copy ordering, counter,
  provenance, guide gating, bounds/palette and legacy-state migration tests.
- Transport unittest discovery:3/3 PASS.
- `theseus.py deploy`: one live3204-cell atomic request, revision12→13.
- `check_interactions.py`: PASS all8 replacements,128 original oak blocks
  reconstructed with provenance, duplicate rejection, undo/redo of geometry and
  interaction state, contrasting representation and restoration to a playable
  zero-progress state at revision26. Artifact
  `reports/intuition/theseus-live-check.log`.
- After this passed, froze `SceneEngine.java`, `SceneModel.java`, `SceneRules.java`
  hashes, then authored an unrelated coordination payoff exhibit using the same
  protocol. No Java change was needed for its new rules/geometry/guide.
- `check_transfer.py`: PASS every payoff outcome in both choice orders, then a
  mutual-reward4→6 counterfactual with updated geometry and explanations. Other
  Theseus objects/counters stayed identical and engine hashes stayed unchanged.
  Both experiments reset to initial playable state at revision55:38 objects,
  20 rules,2 guides. Artifacts `reports/intuition/transfer-live-check.log` and
  `transfer-engine-before.sha256`.
- The coordination choices are visible/sequential, explicitly not a controlled
  simultaneous-choice behavioral study. Reward numbers are stipulated. Primary
  conceptual reference: Ferreira et al.2021, DOI10.1371/journal.pcbi.1009167;
  none of that paper's empirical/theoretical findings are claimed by this board.
- Whole-state restart, final world verification and required local/full quality
  gate outcomes are recorded in Beads/PR once terminal; do not infer them here.

## Unexpected hurdles and guidance

Single-object ownership logic needed replacement with before/after global maps
for touched objects: splitting the old hull into panels transfers ownership
without deleting unchanged physical blocks. Copies read the original snapshot,
so replacing a component before its copy effect in the JSON still recovers the
original material. That invariant has a direct regression test.

Configuration and geometry must be batched together to avoid exposing half-built
interactions. Guide state is semantic content and belongs in the transaction,
not an unrelated configuration file that undo cannot restore. Legacy scenes gain
empty defaults without deleting their meanings or original player snapshots.
Pure metadata transactions skip the synchronous world save; physical edits retain
that existing persistence boundary and its measured performance caveat.

Keep authoring scripts as examples of Codex-generated data, not an allowed-topic
catalogue. Test fixtures refuse existing player progress and online players;
never erase a used experiment simply to rerun acceptance. For reset after actual
play, obtain the intended revision through conversation or use a bounded undo.

Remaining: actual connected Switch exploration/confirmation/inspection/revision/
return, human novel-prompt transfer, simultaneous multiplayer and readability
observations. `dadeto-y15j` separately owns physical NPC goals/local routines and
richer conversation; current guides are fictional authored topics with state,
not autonomous historical-person simulations. Do not mark the whole spec done.
