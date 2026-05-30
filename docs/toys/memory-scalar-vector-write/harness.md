# Harness: Memory Scalar/Vector Write

## Local Run Instructions
1. Install prerequisites: `npm install`
2. Prepare fixtures/config: no external fixtures required; tests create in-memory toy env maps.
3. Run harness command: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-05-28/memoryScalarVectorWrite.test.js`
4. Run full closure check: `npm test`
5. Regenerate static output: `npm run build`

## Expected Observable Outputs
- Terminal output should include:
  - `PASS test/toys/2026-05-28/memoryScalarVectorWrite.test.js`
  - `MEMO3` in generated blog metadata after build
- Artifacts written to:
  - `public/blog.json`
  - `public/index.html`
  - `public/core/browser/toys/2026-05-28/memoryScalarVectorWrite.js`
- Exit code:
  - `0`

## Troubleshooting Hooks
- Verbose mode command: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-05-28/memoryScalarVectorWrite.test.js --verbose`
- Log location: terminal output and Jest coverage artifacts from `npm test`.
- Cleanup command: restore generated `public/` files with `git checkout -- public/` only if abandoning the change.
