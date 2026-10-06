# Harness — Chronoflow

## Local Run Instructions

1. Install prerequisites: `npm install`.
2. Prepare fixtures/config: use fixed grid arrays and explicit fixed-step options; tests never sample wall-clock time.
3. Run harness command: `node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand test/core/browser/game/chronoflow.test.js`.

## Expected Observable Outputs

- Terminal output should include:
  - focused solver suite summary with no failed tests.
  - after the later page/clock milestones, a local Playwright summary with the Chronoflow route, level completion, and offline practice scenarios passing.
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

No gameplay route or test command exists yet. Do not treat absent harness scripts as a failure for the design-only loop; the first implementation bead must add focused deterministic solver tests and update this file with executable commands.
