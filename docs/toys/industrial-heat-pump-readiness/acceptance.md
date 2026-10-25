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

## Later browser presenter (not in this loop)

- [ ] A non-programmer can edit the example without an account.
- [ ] COP, tariffs, process temperature, and electrical capacity update the
  displayed result immediately.
- [ ] A vendor discussion brief identifies user assumptions, critical missing
  measurements, and commissioning questions.
- [ ] Portable JSON/CSV or print output preserves the scenario and screening
  caveats.

## Pass/Fail Rules

Pass the pure slice only when all first-section checks are verified by focused
tests, changed-core coverage, and repository gates. Do not count this slice as
proof of the later browser or vendor-brief acceptance.
