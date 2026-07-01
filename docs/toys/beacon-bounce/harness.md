# Harness: Beacon Bounce

## Local Run Instructions
1. Install prerequisites: `npm install`
2. Prepare fixtures/config: none required
3. Run harness command: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-07-01/beaconBounce.test.js`

## Expected Observable Outputs
- Terminal output should include:
  - `PASS test/toys/2026-07-01/beaconBounce.test.js`
  - a JSON canvas payload with `width`, `height`, and `shapes`
- Artifacts written to:
  - `public/blog.json`
  - `public/index.html`
- Exit code:
  - `0`

## Troubleshooting Hooks
- Verbose mode command: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-07-01/beaconBounce.test.js --verbose`
- Log location: test runner output in the terminal
- Cleanup command: `npm run build`
