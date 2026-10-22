# THREEFOLD logical-grid projection loop

- Unexpected hurdle: the existing eight-pixel tests made display alignment look like complete spatial correctness, while source inspection showed fractional world-tile bounds were only snapped after rendering.
- Diagnosis and fix: kept canonical metre bounds intact and added a pure per-scale integer-cell projection with origin `(0, 0)`, nearest-grid-line rounding, ties toward positive infinity, and a one-cell minimum footprint.
- Evidence: focused projection tests passed (1 suite / 6 tests); the changed-core evaluator passed with no uncovered statements or branches and zero clones (all four metrics 100%). After rebase onto current `origin/main`, `npm run check` passed all 10 gates and six shards (7,182 tests), with zero clones and zero audit vulnerabilities; the 79 manuals validated. `npm run build` passed. Exact-head CI remains to be recorded for the committed slice.
- Next: resolve cell conflicts with deterministic packing/hierarchy outcomes and make the renderer consume that layout before adding further gameplay content.

## Deterministic scene classification follow-up

- Unexpected hurdle: project-to-cell support alone did not tell scene consumers whether two objects that snap into the same cells can coexist.
- Diagnosis and fix: added pure `layoutScene` classification with stable identity ordering, pairwise overlap cells, explicit unresolved conflicts, authored containment checks, shared overlap-group allowances, and optional viewport overflow. This reports crowded cells without moving or deleting canonical entities; it is not yet a packing/movement policy.
- Evidence: focused Jest suite passed (1 suite / 12 tests). The first changed-core evaluator run found two ESLint warnings (one overlong function and one test helper signature), then the first `npm run check` found imprecise inferred result-record types. Extracted relationship and overlap classifiers, tightened JSDoc array types, and converted the test helper to a rest-argument signature. The final changed-core evaluator passed ESLint, core-parse, zero clones, and 100% statements, branches, functions and lines. `TMPDIR=/home/matt/dadeto/.git/tmp-logical-grid DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates across six unit shards; 79 manuals passed, zero clones, zero audit vulnerabilities. `npm run build` passed.
- Next: require deterministic placement/movement policy, semantic proxy/hierarchy resolution, and a renderer consumer with cell geometry assertions before releasing the spatial gate.

## Baseline renderer consumes logical cells

- Unexpected hurdle: the scene classifier could pass while the baseline renderer still independently projected continuous structure bounds.
- Diagnosis and fix: the baseline Broken Gate render path now maps surviving geometry through `layoutScene`, converts the resulting integer bounds back to physical presentation bounds, includes layout diagnostics in frame metadata, and tags rendered structures with their logical cells. Simulation geometry remains untouched; other scene renderers are outside this slice.
- Evidence: the first changed-core evaluator passed 28 suites / 346 tests and all static gates but identified one uncovered defensive throw for a missing layout map entry. Since `layoutScene` emits an entry for every input, removed that redundant throw. The focused renderer suite passed 30 tests, including screen-coordinate and dimensions derived from logical cell bounds. The changed-core evaluator passed 28 suites / 346 tests with both changed core files at 100% statements, branches, functions and lines, clean ESLint/core-parse, and zero clones. The fast `npm run check` passed all 10 gates across six shards; 79 manuals validated, clone count was zero, and audit found zero vulnerabilities. `npm run build` passed.
- Next: use the same renderer contract for other authored scene variants, and add hierarchy/proxy and viewport policies before calling the spatial requirement complete.

## Baseline actors and controls consume logical cells

- Unexpected hurdle: after projecting structures, the scene's controls and residents still rendered from their separate continuous bounds, so one scene could mix cell and non-cell placement.
- Diagnosis and fix: send surviving structures, interactables, and creatures through one stable `layoutScene` projection, expose each entity kind and unresolved overlaps in frame metadata, and tag their shapes with the projected cells. Keep dynamic floodwater on its hydraulic path and verify the rat silhouette stays within its projected footprint.
- Evidence: focused renderer suite passed 30 tests; `TMPDIR=/home/matt/dadeto/.git/tmp-logical-grid DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates across six shards; `npm run build` passed and validated 79 manuals. A first fast-check attempt found a TypeScript undefined lookup in the entity-kind join; sorting the source entities using the layout's stable identity order fixed it, and the clean rerun passed.
- Next: continue the same renderer contract across authored scene variants, and define deterministic packing, semantic proxy/hierarchy, and viewport policies before declaring spatial acceptance complete.

## Authored assembly overlap groups

- Unexpected hurdle: identity-sorted conflicts correctly surfaced collisions between visibly related gate controls and structures, but the layout had no authored way to distinguish those connected assemblies from unrelated collisions.
- Diagnosis and fix: scene names and bounds establish the relief gate, counterweight, and locking pawl as one mechanism, and the signal station and console as another. Preserve those explicit overlap-group IDs through scene copying and scale projection. Keep the rat/wall and weir/mooring collisions unresolved.
- Evidence: focused renderer, spatial, and gatehouse tests passed (3 suites / 48 tests); the changed-core evaluator passed 40 suites / 538 tests, with clean ESLint/core-parse and zero clones; `TMPDIR=/home/matt/dadeto/.git/tmp-logical-grid DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates across six shards; `npm run build` passed and validated 79 manuals. The first evaluator attempt flagged one Prettier warning and the first fast-check attempt found a missing JSDoc optional field; both were corrected before the passing rerun.
- Next: continue mapping authored scene relationships, then define meaningful coarse-scale proxies and deterministic packing without moving canonical simulation entities arbitrarily.
