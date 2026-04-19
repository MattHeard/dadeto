# Cozy House Adventure Harness

## Local Run Instructions
1. Install prerequisites: `npm install`
2. Prepare fixtures/config: `npm run build`
3. Run harness command: `npm test -- --watchman=false --runInBand test/toys/2026-04-19/cozyHouseAdventure.test.js`

## Expected Observable Outputs
- Terminal output should include:
  - `PASS test/toys/2026-04-19/cozyHouseAdventure.test.js`
  - `cozyHouseAdventure`
- Artifacts written to:
  - `coverage/lcov-report/index.html`
  - `coverage/coverage-summary.json`
- Exit code:
  - `0`

## Troubleshooting Hooks
- Verbose mode command: `npm test -- --watchman=false --runInBand --verbose test/toys/2026-04-19/cozyHouseAdventure.test.js`
- Log location: terminal stdout.
- Cleanup command: `rm -rf coverage`
