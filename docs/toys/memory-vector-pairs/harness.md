# Harness: Memory Vector

## Local Run Instructions
1. Install prerequisites: `npm install`
2. Prepare fixtures/config: none required beyond the standard repo helpers
3. Run harness command: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-05-28/memoryVectorPairs.test.js`

## Expected Observable Outputs
- Terminal output should include:
  - `PASS test/toys/2026-05-28/memoryVectorPairs.test.js`
  - `MEMO2` in the generated blog data after build
- Artifacts written to:
  - `public/blog.json`
  - `coverage/` when the full test suite runs
- Exit code:
  - `0`

## Troubleshooting Hooks
- Verbose mode command: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-05-28/memoryVectorPairs.test.js --verbose`
- Log location: test runner output in the terminal
- Cleanup command: `npm run build`
