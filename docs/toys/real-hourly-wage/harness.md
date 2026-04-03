# Harness

## Local Run Instructions
1. Install prerequisites: `npm install`
2. Prepare fixtures/config: `none`
3. Run harness command: `npm test`

## Expected Observable Outputs
- Terminal output should include:
  - `PASS test/toys/2026-04-03/realHourlyWage.test.js`
  - `npm run build`
- Artifacts written to:
  - `public/core/browser/toys/2026-04-03/realHourlyWage.js`
  - `public/index.html`
- Exit code:
  - `0`

## Troubleshooting Hooks
- Verbose mode command: `npm test -- --runInBand test/toys/2026-04-03/realHourlyWage.test.js`
- Log location: `artifacts/toys/real-hourly-wage/commands.log`
- Cleanup command: `rm -f artifacts/toys/real-hourly-wage/commands.log`
