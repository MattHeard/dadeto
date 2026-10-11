# Chronoflow presenter arity cleanup

- Unexpected hurdle: the original presenter combined DOM anchors, user controls, and network/time/storage adapters in a single 19-field object.
- Diagnosis: these fields are three distinct composition contracts, and flattening them in the presenter made the API harder to review and triggered the arity-smuggling rule.
- Fix: group the API into `elements`, `controls`, and `runtime` records; update the production page and focused test adapter; keep those groups named throughout the presenter.
- Evidence: four focused suites passed 46 tests; the content build passed; TSDoc passed; elevated `npm run check` passed all ten gates. Fresh global inventory is 40 findings across 40 files, and the presenter has zero findings. Artifact: `.tmp/parameter-bag-global-after-chronoflow-presenter.json`.
- Next time: continue with the one remaining Chronoflow arity finding in `src/core/browser/game/chronoflow/tide.js`.
