# Harness: Change Together Explorer

## Local Run Instructions
1. Install prerequisites: `npm ci`
2. Prepare fixtures/config: the static histories live in [`test/toys/2026-06-15/changeTogetherExplorer.fixtures.js`](/home/matt/dadeto/test/toys/2026-06-15/changeTogetherExplorer.fixtures.js).
3. Run harness command: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false test/toys/2026-06-15/changeTogetherExplorer.test.js`

## Expected Observable Outputs
- Terminal output should include:
  - `changeTogetherExplorer`
  - `Test Suites: 1 passed`
  - `Tests:`
- Artifacts written to:
  - `public/blog.json`
  - `public/index.html`
- Public blog output should include a `User manual` block for `CHAN1` that stays collapsed until the `show` link is activated.
- Exit code:
  - `0`

## Troubleshooting Hooks
- Verbose mode command: `npm run build`
- Log location: `reports/lint/lint.txt` or the Jest terminal output
- Cleanup command: none required

## Verified Evidence
- Focused test command:
  - `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false test/toys/2026-06-15/changeTogetherExplorer.test.js`
- Repo gates to record after the first pass:
  - `npm test`
  - `npm run check`
  - `npm run build`
- Fixture source:
  - [`test/toys/2026-06-15/changeTogetherExplorer.fixtures.js`](/home/matt/dadeto/test/toys/2026-06-15/changeTogetherExplorer.fixtures.js)
