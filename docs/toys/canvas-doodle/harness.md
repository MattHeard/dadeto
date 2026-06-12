# Harness: Canvas Doodle

## Local Run Instructions
1. Install prerequisites: `npm install`
2. Prepare fixtures/config: none required
3. Run harness command: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/core/browser/presenters/canvasDoodle.test.js test/toys/2026-06-12/canvasDoodle.test.js test/browser/toys.setTextContent.canvasDoodle.test.js`

## Expected Observable Outputs
- Terminal output should include:
  - `PASS test/core/browser/presenters/canvasDoodle.test.js`
  - `PASS test/toys/2026-06-12/canvasDoodle.test.js`
  - `PASS test/browser/toys.setTextContent.canvasDoodle.test.js`
- Artifacts written to:
  - `public/blog.json`
  - `public/index.html`
- Exit code:
  - `0`

## Troubleshooting Hooks
- Verbose mode command: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/core/browser/presenters/canvasDoodle.test.js test/toys/2026-06-12/canvasDoodle.test.js test/browser/toys.setTextContent.canvasDoodle.test.js --verbose`
- Log location: test runner output in the terminal
- Cleanup command: `npm run build`
