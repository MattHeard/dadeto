# Harness: JSON Parse Error Explainer

## Local Run Instructions
1. Install dependencies: `npm install`
2. Run the toy test: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-07-04/jsonParseErrorExplainer.test.js`
3. Run the repo quality gate: `npm run check`

## Expected Observable Outputs
- Terminal output should include:
  - `PASS test/toys/2026-07-04/jsonParseErrorExplainer.test.js`
  - A successful `npm run check` summary
- Exit code:
  - `0`

## Troubleshooting Hooks
- Verbose mode command: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-07-04/jsonParseErrorExplainer.test.js --verbose`
- Log location: `artifacts/toys/json-parse-error-explainer/commands.log`
- Cleanup command: `rm -rf artifacts/toys/json-parse-error-explainer/*`
