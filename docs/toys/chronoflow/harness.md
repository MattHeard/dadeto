# Harness — Chronoflow

## Local Run Instructions

1. Install prerequisites: `npm install`.
2. Prepare fixtures/config: after the playable milestone, run `npm run build` to emit the page and use an injected deterministic test level for automated checks.
3. Run harness command: focused Jest suites for the fluid core and clock adapter; `npm run test:e2e:local` for the full page and unavailable-clock behavior.

## Expected Observable Outputs

- Terminal output should include:
  - focused Jest suite summary with no failed tests and coverage maintained at 100% in the aggregate.
  - local Playwright summary with the Chronoflow route, level completion, and offline practice scenarios passing.
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
