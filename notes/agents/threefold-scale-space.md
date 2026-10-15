# THREEFOLD scale-space loop

## Unexpected hurdle

The full `npm run check` exposed two setup details: toy folders are required to have both a manual and a blog-manifest entry, and adjacent power-of-three calculations differ by floating-point rounding in the last bit. A later test expectation also used the parent grid origin instead of the current finer-cell index for the local offset.

## Diagnosis and fix

The first spatial slice is a pure core prototype, not a published toy. Keep its required toy documentation for the eventual playable integration rather than adding an unavailable game to the blog. Store this loop note under `notes/agents/` until that integration exists. Test scale ratios with a numeric tolerance; preserve the canonical position in metres and derive the scale-local 3×3 region from it. Compute the local offset from the containing cell at the requested scale, while the region origin remains aligned to groups of three finer cells.

## Next-time guidance

Before creating a `docs/toys/<name>/` folder, ensure the toy has a manual and a matching `src/build/blog.json` manual reference. A prototype-only core loop can use its Jest suite and an agent note until it is ready for the toy publishing flow.

For Anchor progression, test the full eight-rung traversal from scale -4 to +4. Recovery must receive an explicit combat state and only advance from simulation minutes while out of combat; preserve fractional progress across calls and clear it at capacity.

Growth currently accepts geometry IDs already identified as intersecting the expanded body volume, spends Anchor and records sorted unique rubble IDs on successful upward transitions. This boundary guarantees the pure state reducer cannot veto the growth command. It does not yet calculate physical overlap or render/save rubble; those remain required follow-up work before the spatial proof milestone is complete.

## Evidence

- `node --input-type=module -e '<scale and canonical-position assertions>'` passed.
- `DADETO_COVERAGE_SHARD_SIZE=80 DADETO_CHECK_TIMEOUT_MS=3600000 DADETO_JEST_POOL_DIR=.tmp/threefold-jest-pool-3 npm run check` exited 0; all 10 quality gates passed, including all unit coverage shards and 11 local browser cases.
- Focused implementation: `src/core/browser/game/threefold/spatial.js`; regression suite: `test/core/browser/game/threefold-spatial.test.js`.
- Anchor loop: one Anchor is charged for each adjacent rung; invalid, locked, and unaffordable changes retain the original state. Recovery is deterministic from game minutes, retains partial intervals, caps at capacity, and is a no-op in combat. The latest direct assertion probe passed after starting at scale -4 (the first probe was incorrect because it attempted eight upward transitions from scale 0).
- `DADETO_COVERAGE_SHARD_SIZE=80 DADETO_CHECK_TIMEOUT_MS=3600000 DADETO_JEST_POOL_DIR=.tmp/threefold-anchor-jest-pool-rerun npm run check` exited 0. The log at `.tmp/threefold-anchor-check.log` records `check-summary` status `passed`, all 10 gates passed, 0 failures, 0 duplication clones, and 11 passing local browser cases. The terminal exit marker is `.tmp/threefold-anchor-check.exit` (`0`).
- Rubble-state focused suite: `node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand --runTestsByPath test/core/browser/game/threefold-spatial.test.js` passed (1 suite, 9 tests); output and exit marker are under `.tmp/threefold-rubble-focused-test.*`.
- `DADETO_COVERAGE_SHARD_SIZE=80 DADETO_CHECK_TIMEOUT_MS=3600000 DADETO_JEST_POOL_DIR=.tmp/threefold-rubble-jest-pool-rerun npm run check` exited 0. `.tmp/threefold-rubble-check.log` records `check-summary` status `passed`, all 10 gates passed, 0 failures, 0 duplication clones, and 11 passing local browser cases. `.tmp/threefold-rubble-check.exit` contains `0`.
