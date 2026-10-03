# Coordinate-resolved segment owner

The strict report identified the common imports and endpoint preparation in
constant-speed travel duration and circle-segment containment. Both now live in
`spatialSegmentCalculations.js`, with original public module paths re-exporting
their named functions. `spacePointResolution.indexResolvedPoints` owns resolved
Map creation. Original keys and last-duplicate-wins semantics are tested directly.
Its generic key-policy helper also owns strict assignment Map construction,
preserving that caller's string-coercion policy.

Parsing, speed validation order, coordinate coercion, JSON output and catch
boundaries remain unchanged. In particular, circle containment still returns
false for malformed JSON but lets coordinate-resolution failures propagate;
travel duration still serializes those failures. Removed the moved parser's
existing mutation suppression. No clone configuration or ignores changed.

Evidence:

- `.tmp/spatial-segment-tests.log`: 1228 tests / 134 suites passed; its coverage
  collection failed because toy-only tests do not fully exercise the resolver.
- The dedicated fulfillment primitives, space-point compatibility and rental
  commitment suites initially passed 39 tests with exact changed-module coverage.
- `.tmp/spatial-segment-final-tests.log` is the final expanded regression run,
  including all toy tests and rental commitment coverage.
- `.tmp/spatial-segment-final-static.log`: nine gates passed, duplication alone failed
  with 103 clones, down from 104, at unchanged strict minTokens14.

Next time include the rental commitment suite when collecting full resolver
coverage. A passing toy-only suite is not proof of exact shared-module coverage.
The first formatted index helper exposed a suffix clone with assignment indexing;
sharing Map construction with an explicit key callback removed it structurally.
The aggregate zero-clone goal remains open in `dadeto-aaou`.
