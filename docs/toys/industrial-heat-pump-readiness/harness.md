# Industrial heat-pump readiness harness

## Local Run Instructions

1. Install prerequisites: `npm install` when dependencies are missing.
2. Prepare fixtures/config: none; the synthetic food-processing case is stored
   as a deterministic test fixture.
3. Run harness command:

   ```sh
   node scripts/run-jest.js --runInBand test/core/industrialHeatPumpReadiness.test.js test/browser/industrialHeatPumpPage.test.js
   ```

For changed-core coverage, use:

```sh
npm run check:impact:run -- --files src/logic/core/industrial-heat-pump/values.js test/core/industrialHeatPumpReadiness.test.js
```

For presenter and scenario coverage, run:

```sh
node scripts/run-jest.js --runInBand --coverage --collectCoverageFrom=src/core/browser/industrialHeatPump/page.js --collectCoverageFrom=src/logic/core/industrial-heat-pump/scenarios.js --coverageReporters=text --runTestsByPath test/browser/industrialHeatPumpPage.test.js test/core/industrialHeatPumpReadiness.test.js
```

Run repository acceptance with `npm run check` and `npm run build`.
The presenter remains under `src/core/browser/industrialHeatPump/`; screening
arithmetic, comparison, feasibility, thresholds and presets/exports live under
`src/logic/core/industrial-heat-pump/`. The total unknown-input parser lives under
`src/logic/boundary/industrial-heat-pump/`; browser entry files compose these
operations and browser-only effects. The browser adapter injects the validated calculation and the
local download/print effects.

## Static page preview

After `npm run build`, start `npm start -- --listen 4173` and open
`http://localhost:4173/industrial-heat-pump-readiness/` in a browser. The page
should show the base comparison, separate temperature/power/economics cards,
and a hypothetical screening disclosure. Edit the COP or tariff to confirm the
comparison changes, then use the scenario selector, reset, JSON export, and
print actions. No network endpoint is required.

## Expected Observable Outputs

- Terminal output should include: focused core and presenter suites pass; model
  results match the hand-worked fixture; page interactions recalculate,
  validate, export, and print through injected local effects.
- Artifacts written to: Jest/coverage reports under `.tmp/` or configured
  `reports/` paths; the pure calculator itself writes no files.
- Exit code: `0`.

## Troubleshooting Hooks

- Verbose mode command: add `--verbose` to the Jest command.
- Log location: terminal output; calculator evidence is in Bead `dadeto-2j89`
  and presenter evidence is in Bead `dadeto-m5lz`.
- Cleanup command: remove only the local generated coverage artifact if needed;
  no external state is created.

## Portable data and numeric limits

The presenter tests serialize exported assumptions/results, recalculate the
comparison, and preserve optional sector/process/input/output graph references.
The core fixture suite exercises finite values whose combinations overflow
energy, power, or financial arithmetic. The UI must hide stale output, state
the numeric-range error, and disable export; resetting restores the example.

For whole-domain mutation validation, run separately from other full mutation
workers on constrained hosts:

```sh
DADETO_STRYKER_MAX_TEST_RUNNER_REUSE=10 npm run mutant:all -- docs/quality/heat-pump.stryker.config.mjs
```

This scope includes every domain module and the complete preceding WGS84/build
packaging scope, including static mutants, with a 100 threshold and no skips.
Inspect `reports/mutation/heat-pump.json`: engine score alone does not establish
success if RuntimeError or other excluded statuses exist. Record a terminal exit
receipt and compare embedded source with the tested head. The original 17-mutant
arithmetic-only run is historical evidence, not evidence for this migration.

After `npm run build` and `npm run build:cloud`, run the actual built-module
closure and native contract harness:

```sh
node test/fixtures/typed-logic/heat-pump-artifact-equivalence.js public infra/cloud-functions/object-minute-rental-search
```

It resolves all static imports of nine published entry/compatibility URLs and
repeats 613 calculations and 19 portable exports against original-only hashes.
`node test/fixtures/typed-logic/heat-pump-equivalence.js` separately compares the
immutable original seven-module source graph, getter failures/read order, aliases,
frozen presets and 360 additional mutable-getter observations. It does not
regenerate original receipts during ordinary execution. All four changed-logic
coverage metrics are recorded under `reports/coverage/heat-pump-domain/`.
