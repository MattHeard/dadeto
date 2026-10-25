# Threefold small-world pixel bounds

- Unexpected hurdle: Full Check reported uncovered nullish width/height arms in `boundsOf`, even though the helper only receives rendered small-world body pixels.
- Diagnosis: `smallWorldActorSprite` creates the pixel rectangles and sets numeric dimensions; the fallbacks to zero were stale defensive branches that did not describe a valid input.
- Fix: constrained the helper's documented input to rectangles with required dimensions, removed both defaults, and added a renderer regression asserting all compact actor body pixels retain numeric width and height.
- Evidence: focused Threefold renderer Jest passed 52/52. Focused coverage passed 52/52 and `/tmp/threefold-bounds-coverage/coverage-final.json` contains no branch entries at the removed `boundsOf` fallback lines. `npm run tsdoc:check` passed; elevated `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates (1,045 suites / 7,664 tests); build, spec refresh, and diff check passed.
- Next-time guidance: follow data from producers before adding branch tests. If an invariant is already guaranteed by an internal producer, encode the narrower input contract instead of manufacturing an invalid shape.
