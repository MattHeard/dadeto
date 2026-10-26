# Supply-chain Nowcasting Harness

Describe how to run the toy locally and what outputs should be observed.

## Local Run Instructions
1. Install repository dependencies with `npm install` if `node_modules` is missing.
2. Use deterministic sample fixtures in the focused Jest test; no secrets or external services are needed.
3. Run `node scripts/run-jest.js --runInBand --runTestsByPath test/core/browser/game/supplyChainNowcasting.test.js test/core/browser/game/supply-chain-nowcasting-page.test.js test/generator/decisionToolCatalogueLinks.test.js`.
4. Run `npm run check` and `npm run build`.

## Expected Observable Outputs
- Terminal output should include:
  - `Test Suites: 3 passed` for planner, page, and catalogue suites.
- Artifacts written to:
  - Jest terminal report; later Stryker report at `reports/mutation/supply-chain-nowcasting.json`.
- Exit code:
  - `0`

## Troubleshooting Hooks
- Verbose mode command: `node scripts/run-jest.js --runInBand --verbose --runTestsByPath test/core/browser/game/supplyChainNowcasting.test.js test/core/browser/game/supply-chain-nowcasting-page.test.js test/generator/decisionToolCatalogueLinks.test.js`.
- Log location: exact commands and outcomes on the owning Bead.
- Cleanup command: no persistent generated fixture or external resource needs cleanup.
