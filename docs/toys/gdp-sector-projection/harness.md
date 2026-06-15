# Harness: GDP Sector Projection

## Local Run Instructions
1. Install prerequisites: `npm install`
2. Prepare fixtures/config: none required
3. Run harness command: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/core/browser/presenters/graphPlot.series.test.js test/toys/2026-06-14/gdpSectorProjection.test.js`

## Expected Observable Outputs
- Terminal output should include:
  - `PASS test/core/browser/presenters/graphPlot.series.test.js`
  - `PASS test/toys/2026-06-14/gdpSectorProjection.test.js`
- Artifacts written to:
  - `reports/`
- Exit code:
  - `0`

## Troubleshooting Hooks
- Verbose mode command: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/core/browser/presenters/graphPlot.series.test.js test/toys/2026-06-14/gdpSectorProjection.test.js --verbose`
- Log location: test runner output in the terminal
- Cleanup command: `npm test`
- To verify the fallback snapshot specifically, run the toy with `{}` or `{"forecast":{"outputEndYear":2030}}` and confirm it still renders the public historical series.
