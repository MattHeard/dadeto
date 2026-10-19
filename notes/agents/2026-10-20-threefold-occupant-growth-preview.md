# THREEFOLD occupant growth preview

- Unexpected hurdle: the local check caught the new episode update widening `latchfolk: 'lost'` to `string`, which did not satisfy the documented outcome union.
- Diagnosis: the state object is inferred as mutable JavaScript, so its string literal widened at the conditional update even though `createThreefoldEpisodeState` defines the exact outcome union.
- Fix: annotate the new literal as `'lost'`, preserving the existing episode type; keep preview and committed outcome based on the same growth-intersection helper.
- Next-time guidance: run `npm run check` after adding a new persisted union outcome; TSDoc checking catches state-shape drift even when runtime Jest passes.
- Evidence: five focused suites passed (119 tests); `npm run build` passed; `npm run check` passed all 10 local gates (958 suites / 6,591 tests across five impact shards, zero clones). Exact pushed-commit Full Check remains pending.
