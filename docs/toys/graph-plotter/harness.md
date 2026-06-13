# Harness: Graph Plotter

## Local Run Instructions
1. Install prerequisites: `npm install`
2. Prepare fixtures/config: none required
3. Run harness command: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/core/browser/presenters/graphPlot.test.js test/toys/2026-06-13/graphPlot.test.js test/browser/toys.setTextContent.graphPlot.test.js`

## Expected Observable Outputs
- Terminal output should include:
  - `PASS test/core/browser/presenters/graphPlot.test.js`
  - `PASS test/toys/2026-06-13/graphPlot.test.js`
  - `PASS test/browser/toys.setTextContent.graphPlot.test.js`
- Artifacts written to:
  - `public/blog.json`
  - `public/index.html`
- Exit code:
  - `0`

## Troubleshooting Hooks
- Verbose mode command: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/core/browser/presenters/graphPlot.test.js test/toys/2026-06-13/graphPlot.test.js test/browser/toys.setTextContent.graphPlot.test.js --verbose`
- Log location: test runner output in the terminal
- Cleanup command: `npm run build`
