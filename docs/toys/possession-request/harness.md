# Harness: Possession Request

## Local Run Instructions
1. Install prerequisites: `npm install`
2. Prepare fixtures/config: none; tests use inline JSON.
3. Run harness command: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-08-17/possessionRequest.test.js`

## Expected Observable Outputs
- Terminal output should include: `3 passed`
- Artifacts written to: `public/` after `npm run build`
- Exit code: `0`

## Troubleshooting Hooks
- Verbose mode: append `--verbose` to the focused Jest command.
- Log location: `artifacts/toys/possession-request/commands.log`
- Cleanup command: remove only generated `public/` output if needed.
