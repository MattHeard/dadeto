# Harness: Memory Vector

## Local Run Instructions
1. Install dependencies: `npm install`
2. Run the toy test: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-05-28/memoryVector.test.js`
3. Run the full repository tests: `npm test`

## Expected Observable Outputs
- Terminal output should include:
  - `PASS test/toys/2026-05-28/memoryVector.test.js`
  - `MEMV1` in the generated blog data after build
- Artifacts written to:
  - `public/blog.json`
  - `coverage/` when the full test suite runs
- Exit code:
  - `0`

## Troubleshooting Hooks
- Verbose mode command: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-05-28/memoryVector.test.js --verbose`
- Log location: test runner output in the terminal
- Cleanup command: `npm run build`
