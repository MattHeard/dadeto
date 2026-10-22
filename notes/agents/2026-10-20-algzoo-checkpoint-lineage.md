# AlgZoo checkpoint lineage

## Unexpected hurdle

The first attempt to fetch the public checkpoint objects failed DNS resolution. In a later session, public GCS access worked. The original synthetic-only fixture and its access-failure note were stale once the objects became reachable.

## Diagnosis

The official AlgZoo loader at commit `4433f505a90e85a37d35d34f80f6cccf4a37cef4` uses objects named `2nd_argmax_16_10_{n_seqs}_2.pth` for the M16,10 second-argmax seed-2 run. The twelve progress values are `0` and `2^20` through `2^30`. Each public object was streamed directly into SHA-256; no checkpoint weights were saved. The exact hash-to-progress pairs are recorded in `test/core/interpretability/researchBundleV2.test.js`.

The checkpoint SHA identifies the weight snapshot. The official loader revision identifies the source used to interpret object naming and configuration. The stable run ID in Atlas is a local identifier derived from the model and seed, not a publisher-issued run ID.

## Chosen fix

The portable V3 lineage regression now uses all twelve measured public SHA-256 values, records the source model and loader revision, and round-trips the training-run ID and training-sequence progress alongside each hash. It verifies twelve distinct checkpoint component IDs, one shared longitudinal coordinate for the seed-2 run, and separation from an independent run.

The first updated test run exposed two assumptions in the earlier synthetic test: exported component order is identity-sorted, not run-grouped or chronological. The regression now groups by the persisted run ID and sorts checkpoint metadata by progress before comparing the exact hash-to-progress mapping.

Focused evidence: `npm run test:impact -- --files test/core/interpretability/researchBundleV2.test.js` passed 1 suite / 14 tests using the repository's local Zod test double. No weights were stored and no inference was run. The fast repository check and exact-head CI remain required before closing the Bead.

## Next-time guidance

For later checkpoint lineage work, keep model repository revision, checkpoint SHA-256, Atlas training-run ID, and training progress as separate facts. Do not infer chronological order from portable component ordering. Compare snapshots by explicit progress or identity fields. Keep real weights out of test fixtures; immutable SHA values are enough to verify portable identity metadata.
