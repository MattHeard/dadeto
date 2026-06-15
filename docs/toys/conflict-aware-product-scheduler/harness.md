# Harness: Conflict-Aware Product Scheduler

## Local Run Instructions
1. Install prerequisites: `npm ci`
2. Prepare fixtures/config: none required; the toy reads inline JSON input.
3. Run harness command: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false test/toys/2026-06-15/conflictAwareProductScheduler.test.js`

## Expected Observable Outputs
- Terminal output should include:
  - `conflictAwareProductScheduler`
  - `Test Suites: 1 passed`
  - `Tests:`
- Artifacts written to:
  - `public/blog.json`
  - `public/index.html`
- Exit code:
  - `0`

## Troubleshooting Hooks
- Verbose mode command: `npm run build`
- Log location: `reports/lint/lint.txt` or the Jest terminal output
- Cleanup command: none required

## Verified Evidence
- Focused test: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false test/toys/2026-06-15/conflictAwareProductScheduler.test.js`
  - Result: `8 passed`
- Repo test gate: `npm test`
  - Result: `585 suites, 3088 tests`
- Repo check gate: `npm run check`
  - Result: `check-suite passed`
- Build gate: `npm run build`
  - Result: regenerated `public/blog.json` and `public/index.html`
