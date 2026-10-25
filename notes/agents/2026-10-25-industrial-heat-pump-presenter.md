# Industrial heat-pump presenter

- Unexpected hurdle: the first browser presenter was 423 lines under `src/browser`, and its scenario table introduced four clone findings after moving into core.
- Diagnosis: `npm run non-core-thin` requires small adapters outside core; the core presenter also rejects a five-value dependency bag. `npm run duplication` identified repeated assumption defaults and form-field lookup blocks.
- Chosen fix: moved the presenter and presets into `src/core/browser/industrialHeatPump`, injected calculation/download/print dependencies through the small browser wrapper, shared the common scenario assumptions, and cached form inputs once per page lifetime.
- Evidence: focused model/presenter tests pass 53/53 with 100% statements, branches, functions, and lines; `npm run non-core-thin`, focused ESLint, and `npm run duplication` pass with zero clones. `npm run build` passes. `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passes all 10 fast local gates across six selected-test shards; all 1,995 tests in the Threefold shard pass. Full CI `check:full` remains separate evidence.
- Next-time guidance: put substantial browser presenter logic in the injected core browser layer from the start, keep external effects in `src/browser`, and derive sensitivity presets from one shared base fixture to avoid repeated literals.

## Final export/limit audit

- Hurdle: the initial UI export lacked a documented graph-reference contract;
  finite input validation also allowed combinations that overflowed the result.
- Diagnosis: audit every Notion scope item and test extreme finite COP/hours,
  efficiency/heat demand, and financial-target combinations through the public
  browser boundary rather than changing the trusted arithmetic.
- Fix: use one versioned export builder with optional sector/process/input/output
  entity IDs; document the portable record. Validate the calculated comparison
  at the browser boundary and show a clear numeric-range error, hide stale
  results/briefs, and disable export until reset or corrected input.
- Focused evidence: 59 model/presenter tests pass; all three heat-pump core
  modules reach 100% across four coverage metrics at
  /tmp/heat-pump-export-coverage/coverage-final.json. Pure calculator Stryker
  killed all 17 mutants (reports/mutation/mutation.json). The mobile capture was
  visually reviewed. Record final aggregate/build/CI evidence in dadeto-m5lz.
- Guidance: a finite input guard does not establish finite arithmetic; validate
  only the public comparison so legitimate unavailable raw ratios remain valid.

- Final export-loop gates passed: DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run
  check (10/10 local gates, six unit shards, zero clones), npm run build
  (/tmp/dadeto-heat-pump-export-build.log), npm run manuals:check (85 manuals),
  and git diff --check. The browser boundary remains a 36-line adapter.
