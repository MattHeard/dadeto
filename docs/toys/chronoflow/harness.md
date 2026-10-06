# Harness — Chronoflow

## Local Run Instructions

1. Install prerequisites: `npm install`.
2. Prepare fixtures/config: use fixed grid arrays and explicit fixed-step options; tests never sample wall-clock time.
3. Run focused solver, runtime, and presenter tests: `node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand test/core/browser/game/chronoflow.test.js`.
4. Run trusted-clock and tide tests: `node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand test/core/browser/game/chronoflow-network-clock.test.js test/core/browser/game/chronoflow-tide.test.js test/core/cloud/chronoflow-time-core.test.js`.
5. Run the focused local page journey: `npm run test:e2e:local -- --grep Chronoflow`.
6. Run the full local game journey: `npm run test:e2e:local`.

## Expected Observable Outputs

- Terminal output should include:
  - focused solver suite summary with no failed tests.
  - local Playwright summary with Chronoflow route choice, sluice opening, trusted high-tide timed record, unavailable-clock practice, and reset scenarios passing.
  - focused runtime/presenter coverage for the two editable channel sites, the edit cap, reversibility, and reset.
- Artifacts written to:
  - `reports/coverage/coverage-summary.json`
  - the configured local Playwright report output.
- Pressure projection regression: a fixed-order 24-iteration Jacobi solve must lower the existing cell-centered face divergence, preserve solid walls and volume, and replay a varied 8×6 closed field identically for 600 steps.
- Exit code:
  - `0`

## Troubleshooting Hooks

- Verbose mode command: `DEBUG=pw:api npm run test:e2e:local`.
- Log location: terminal output plus `reports/coverage/` and the configured Playwright report directory.
- Cleanup command: stop local app/server processes and remove only the dedicated Chronoflow test artifacts when present.

## Design-Loop Limitation

The Archive Entry puzzle can always be completed as practice. It reads `chronoflowTimeUrl` from `/config.json`, displays synchronized tide phase from Internet epoch samples, and offers a timed attempt only when the full uncertainty interval falls inside high tide. Timed sluice/advance actions pause if the trusted window closes; only a timed attempt completed in that window grants a record. Per-cell direction arrows, depth, normalized hydraulic head, and velocity are derived from deterministic solver snapshots. Configuration failure and stale sync deny timed play without blocking puzzle completion.
