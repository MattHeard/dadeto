# Atlas native checkpoint lineage

## Loop result

The Pythia-backed V3 bundle regression now round-trips one native neuron at two immutable checkpoints plus a similar coordinate from a distinct model. It proves that revisions remain attached to checkpoint-specific component IDs, same-model checkpoints share a coordinate ID without sharing a component ID, and the separate model does not collide. Each V1 mechanism keeps its own exact link to its V2 component; native links still do not invent activation positions.

## Unexpected hurdle and diagnosis

The first focused run passed all 13 bundle tests but ESLint flagged one line wrap in the new assertions. The only change needed was to match the repository's formatter; the scenario and identity results were already passing.

## Evidence

- `npm run check:impact:run -- --files test/core/interpretability/researchBundleV2.test.js` — passed; 1 suite / 13 tests, ESLint passed.
- `npm run check` — passed all 10 gates; impact selected the same 1 suite / 13 tests, 0 failures, duplication 0 clones.
- Exact-head Full Check and Terraform Validate — record run IDs in Bead `dadeto-xkoo` and the Rank 4 Notion spec after push.

## Next-time guidance

When proving longitudinal identity, round-trip the full links and pinned revisions together. Constructor-only assertions show the ID rule but not that portable records preserve checkpoint separation or V1-to-V2 lineage.
