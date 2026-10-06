# Harness — Chronoflow

## Local Run Instructions

1. Install prerequisites: `npm install`.
2. Prepare fixtures/config: use fixed grid arrays and explicit fixed-step options; tests never sample wall-clock time.
3. Run focused solver, runtime, and presenter tests: `node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand test/core/browser/game/chronoflow.test.js`.
4. Run trusted-clock tests: `node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand test/core/browser/game/chronoflow-network-clock.test.js test/core/cloud/chronoflow-time-core.test.js`.
5. Run the focused local page journey: `npm run test:e2e:local -- --grep Chronoflow`.
6. Run the full local game journey: `npm run test:e2e:local`.

## Expected Observable Outputs

- Terminal output should include:
  - focused solver suite summary with no failed tests.
  - local Playwright summary with Chronoflow sluice opening, target delivery, untimed-practice label, and reset scenarios passing.
- Artifacts written to:
  - `reports/coverage/coverage-summary.json`
  - the configured local Playwright report output.
- Exit code:
  - `0`

## Troubleshooting Hooks

- Verbose mode command: `DEBUG=pw:api npm run test:e2e:local`.
- Log location: terminal output plus `reports/coverage/` and the configured Playwright report directory.
- Cleanup command: stop local app/server processes and remove only the dedicated Chronoflow test artifacts when present.

## Design-Loop Limitation

The current page remains untimed. The trusted clock endpoint is deployed separately as a public Cloud Function, with its URL exposed by Terraform output `chronoflow_time_url`; the page adapter still needs deployment configuration or same-origin routing before it can consume that URL. Tide-driven gameplay and timed completion remain later-loop work.
