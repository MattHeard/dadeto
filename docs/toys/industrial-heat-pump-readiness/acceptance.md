# Industrial heat-pump readiness acceptance

## Pure calculator slice

### Machine-checkable criteria

- [x] The synthetic food-processing fixture matches hand-worked useful-heat,
  incumbent-fuel, heat-pump-electricity, annual-cost, savings, and payback
  calculations.
- [x] The result reports temperature feasibility, electrical-power feasibility,
  and economic status separately.
- [x] Zero operating hours, missing or non-finite inputs, invalid efficiencies,
  invalid COP, and out-of-range temperatures return explicit validation errors.
- [x] Zero/nonpositive annual savings produce a not-applicable payback result,
  never infinity or a fabricated year count.
- [x] COP and maximum installed-cost thresholds are available only when their
  formulas have a positive feasible denominator; otherwise the result says
  that the target cannot be achieved from the supplied assumptions.
- [x] The calculator lives in `src/core`, stays deterministic and service-free,
  and passes 100% statement/branch/function/line coverage for changed core.
- [x] `npm run check`, `npm run build`, focused lint, and `git diff --check` pass.

### Verified evidence

- Focused Jest: 39 tests passed; `src/core/industrialHeatPumpReadiness.js` reached
  100% statements, branches, functions, and lines in
  `.tmp/industrial-heat-pump-coverage/coverage-final.json`.
- `npm run check`: passed all 10 gates. Change selection fell back to the full
  local unit suite because the new toy documentation path is unsupported by the
  impact selector; all 1,048 suites / 7,716 tests passed across six shards.
- `npm run build`, `npm run manuals:check`, `npm run core-parse`, focused ESLint,
  `npm run non-core-thin`, and `git diff --check` passed.
- The public input boundary validates without a runtime schema dependency; core
  contains only arithmetic. Browser presentation and portable vendor brief stay
  in the later acceptance section.

### Evidence Collection

- Core: `src/core/industrialHeatPumpReadiness.js`.
- Fixture/regressions: `test/core/industrialHeatPumpReadiness.test.js`.
- Loop command and outcomes: owning Bead `dadeto-2j89`.

## Browser presenter

- [x] A non-programmer can edit the example without an account.
- [x] COP, tariffs, process temperature, and electrical capacity update the
  displayed result immediately; invalid values clear stale result cards.
- [x] Temperature, site-power, and operating-economics results are separate.
- [x] Conservative/base/improved-COP-and-temperature scenarios and reset work.
- [x] A vendor discussion brief identifies user assumptions, critical missing
  measurements, commissioning questions, and screening caveats.
- [x] Portable JSON export and print output preserve the scenario and caveats.
- [x] The responsive page loads through the static site and has no account,
  remote API, backend, or browser-storage dependency.
- [x] The presenter and scenario definitions live in `src/core/browser`; the
  `src/browser` adapter injects calculation and browser-only effects and passes
  the non-core thin-file gate.

### Presenter evidence — 2026-10-25

- `test/browser/industrialHeatPumpPage.test.js`: 14 cases cover initial base
  results, live edits, presets/reset, invalid/stale-result hiding, no-payback
  output, independent temperature/power constraints, export/print adapters,
  missing DOM states, no remote API/storage, and disposal.
- Focused model and presenter coverage is 100% for statements, branches,
  functions, and lines (53/53 tests). Repository check/build evidence is
  recorded in Bead `dadeto-m5lz`.

## Portable export and final acceptance — 2026-10-25

- [x] The version-one export contract preserves optional industry-graph entity
  references for sector, process, inputs, and outputs without requiring a graph.
- [x] JSON serialization and recalculation from the exported assumptions
  reproduce the exported comparison, including linked-reference metadata.
- [x] Extreme finite inputs that overflow a displayed calculation produce an
  explicit numeric-range error; stale results/briefs are hidden and export is
  disabled until assumptions are corrected.
- Focused model/presenter tests pass 59/59 with 100% statements, branches,
  functions, and lines for all three heat-pump core modules; artifact:
  `/tmp/heat-pump-export-coverage/coverage-final.json`.
- The pure arithmetic mutation run killed all 17 mutants, with no survivors or
  timeouts; artifact: `reports/mutation/mutation.json`.
- Existing mobile capture `/tmp/industrial-heat-pump-mobile.png` was visually
  reviewed for readable labels, separate result cards, caveats, and the brief.
- The prior production deployment for `02535c1` passed. Global Full Check
  remains separately tracked in `dadeto-3jh8`; the failed `40176886902` run
  passed every unit shard but missed the global branch threshold in other
  modules. Do not describe focused coverage as global coverage or E2E evidence.

- Final export-loop gates: `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check`
  passed all 10 fast local gates across six test shards with zero clones;
  `npm run build` passed (log `/tmp/dadeto-heat-pump-export-build.log`);
  `npm run manuals:check` validated 85 manuals; `git diff --check` passed.

## Pass/Fail Rules

Verify the calculator, presenter, and portable-export criteria together before
closing the feature. Record local checks/build and authoritative CI evidence
separately. Any unrelated global failure must retain an owning quality Bead
and triage note; the overarching quality issue stays open until Full Check
passes.
