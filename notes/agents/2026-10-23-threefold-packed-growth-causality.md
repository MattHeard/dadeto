# THREEFOLD packed-display growth causality

## Loop

Strengthened the +3 to +4 Broken Gate regression so it proves that two remote structures share the same raw logical cell, receive separate non-overlapping display cells after packing, and remain outside physical growth damage and persisted destruction state.

## Unexpected hurdle and diagnosis

- The first focused Jest run could not create `/tmp/dadeto-jest-pool/active` in the read-only sandbox. The failure was environmental (`EROFS`), before test execution; rerunning with reviewed write access passed.
- The prior regression checked only `placement: 'placed'` and absence from the final conflict list. It did not directly assert the pre-pack projection collision or compare packed cell rectangles.

## Fix

- Compare both remote entities' raw `projectEntity` cell bounds.
- Assert their final packed cell bounds are disjoint, while preserving existing preview, growth, save/restore, and source-immutability assertions.
- Tighten the THREEFOLD acceptance and harness text to name those checks.

## Evidence

- `npm run test:impact -- --files test/core/browser/game/threefold-growth-occupant.test.js`: 1 suite / 18 tests passed.
- `DADETO_CHECK_BASE=origin/main DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check`: all 10 gates passed.
- `npm run build`: passed.
- `npm run manuals:check`: validated 79 toy manuals.
- `git diff --check`: passed.
- Exact-head Full Check and Terraform Validate for the separate Weftways PR remain tracked on Bead `dadeto-yvs7`.

## Next-time guidance

When testing that presentation packing cannot affect simulation, assert both sides of the boundary: colliding raw projections and disjoint display projections, then verify physical preview and serialized outcomes from the unchanged canonical scene.
