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
npm run check:impact:run -- --files src/core/industrialHeatPumpReadiness.js test/core/industrialHeatPumpReadiness.test.js
```

For presenter and scenario coverage, run:

```sh
node scripts/run-jest.js --runInBand --coverage --collectCoverageFrom=src/core/browser/industrialHeatPump/page.js --collectCoverageFrom=src/core/browser/industrialHeatPump/scenarios.js --coverageReporters=text --runTestsByPath test/browser/industrialHeatPumpPage.test.js test/core/industrialHeatPumpReadiness.test.js
```

Run repository acceptance with `npm run check` and `npm run build`.
The presenter implementation and scenarios live under
`src/core/browser/industrialHeatPump/`; the matching `src/browser/` files are
thin adapters. The browser adapter injects the validated calculation and the
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
