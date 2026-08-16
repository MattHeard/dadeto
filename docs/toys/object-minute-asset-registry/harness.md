# Harness: Object-minute Asset Registry

## Local Run Instructions
1. Install prerequisites: `npm install`
2. Prepare fixtures/config: none; tests provide inline JSON fixtures.
3. Run harness command: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-08-16/assetRegistry.test.js`

## Expected Observable Outputs
- Terminal output should include: `2 passed`
- Artifacts written to: `public/` after `npm run build`
- Exit code: `0`

## Troubleshooting Hooks
- Verbose mode: append `--verbose` to the focused Jest command.
- Log location: `artifacts/toys/object-minute-asset-registry/commands.log`
- Cleanup command: remove only generated `public/` output if needed.
