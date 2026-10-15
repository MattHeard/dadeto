# THREEFOLD scale-space loop

## Unexpected hurdle

The full `npm run check` exposed two setup details: toy folders are required to have both a manual and a blog-manifest entry, and adjacent power-of-three calculations differ by floating-point rounding in the last bit. A later test expectation also used the parent grid origin instead of the current finer-cell index for the local offset.

## Diagnosis and fix

The first spatial slice is a pure core prototype, not a published toy. Keep its required toy documentation for the eventual playable integration rather than adding an unavailable game to the blog. Store this loop note under `notes/agents/` until that integration exists. Test scale ratios with a numeric tolerance; preserve the canonical position in metres and derive the scale-local 3×3 region from it. Compute the local offset from the containing cell at the requested scale, while the region origin remains aligned to groups of three finer cells.

## Next-time guidance

Before creating a `docs/toys/<name>/` folder, ensure the toy has a manual and a matching `src/build/blog.json` manual reference. A prototype-only core loop can use its Jest suite and an agent note until it is ready for the toy publishing flow.

## Evidence

- `node --input-type=module -e '<scale and canonical-position assertions>'` passed.
- `DADETO_COVERAGE_SHARD_SIZE=80 DADETO_CHECK_TIMEOUT_MS=3600000 DADETO_JEST_POOL_DIR=.tmp/threefold-jest-pool-3 npm run check` exited 0; all 10 quality gates passed, including all unit coverage shards and 11 local browser cases.
- Focused implementation: `src/core/browser/game/threefold/spatial.js`; regression suite: `test/core/browser/game/threefold-spatial.test.js`.
