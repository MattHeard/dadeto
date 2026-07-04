# Harness: JSON Canonicalizer

## Local Run Instructions
1. Install dependencies: `npm install`
2. Run the toy test: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-07-04/jsonCanonicalizer.test.js`
3. Run the repo quality gate: `npm run check`

## Expected Observable Outputs
- Terminal output should include:
  - `PASS test/toys/2026-07-04/jsonCanonicalizer.test.js`
  - A successful `npm run check` summary
- Artifacts written to:
  - `artifacts/toys/json-canonicalizer/commands.log`
  - `artifacts/toys/json-canonicalizer/test-report.*` if a report is produced by the local harness
- Exit code:
  - `0`

## Troubleshooting Hooks
- Verbose mode command: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-07-04/jsonCanonicalizer.test.js --verbose`
- Log location: `artifacts/toys/json-canonicalizer/commands.log`
- Cleanup command: `rm -rf artifacts/toys/json-canonicalizer/*`
