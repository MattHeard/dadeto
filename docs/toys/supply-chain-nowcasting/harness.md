# Supply-chain Nowcasting Harness

Describe how to run the toy locally and what outputs should be observed.

## Local Run Instructions
1. Install repository dependencies with `npm install` if `node_modules` is missing.
2. Use deterministic sample fixtures in the focused Jest test; no secrets or external services are needed.
3. Run `npx jest --runInBand --runTestsByPath test/core/browser/game/supplyChainNowcasting.test.js`.
4. Run `npm run check`; run `npm run build` after browser page integration.

## Expected Observable Outputs
- Terminal output should include:
  - `Test Suites: 1 passed` for the focused model suite.
- Artifacts written to:
  - Jest terminal report; later Stryker report at `reports/mutation/supply-chain-nowcasting.json`.
- Exit code:
  - `0`

## Troubleshooting Hooks
- Verbose mode command: `npx jest --runInBand --verbose --runTestsByPath test/core/browser/game/supplyChainNowcasting.test.js`.
- Log location: exact commands and outcomes on the owning Bead.
- Cleanup command: no persistent generated fixture or external resource needs cleanup.
