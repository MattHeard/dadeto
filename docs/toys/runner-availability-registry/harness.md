# Harness: Runner Availability Registry

## Local Run Instructions
1. Install prerequisites: `npm install`
2. Run: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-08-18/runnerAvailabilityRegistry.test.js`

## Expected Observable Outputs
- Terminal output should include: `3 passed`
- `npm run build` should include public `RUNN1` output.
