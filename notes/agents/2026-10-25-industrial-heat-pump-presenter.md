# Industrial heat-pump presenter

- Unexpected hurdle: the first browser presenter was 423 lines under `src/browser`, and its scenario table introduced four clone findings after moving into core.
- Diagnosis: `npm run non-core-thin` requires small adapters outside core; the core presenter also rejects a five-value dependency bag. `npm run duplication` identified repeated assumption defaults and form-field lookup blocks.
- Chosen fix: moved the presenter and presets into `src/core/browser/industrialHeatPump`, injected calculation/download/print dependencies through the small browser wrapper, shared the common scenario assumptions, and cached form inputs once per page lifetime.
- Evidence: focused model/presenter tests pass 53/53 with 100% statements, branches, functions, and lines; `npm run non-core-thin`, focused ESLint, and `npm run duplication` pass with zero clones. `npm run build` passes. `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passes all 10 fast local gates across six selected-test shards; all 1,995 tests in the Threefold shard pass. Full CI `check:full` remains separate evidence.
- Next-time guidance: put substantial browser presenter logic in the injected core browser layer from the start, keep external effects in `src/browser`, and derive sensitivity presets from one shared base fixture to avoid repeated literals.
