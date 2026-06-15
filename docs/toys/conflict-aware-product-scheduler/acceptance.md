# Acceptance Criteria: Conflict-Aware Product Scheduler

## Machine-Checkable Criteria
- [x] `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false test/toys/2026-06-15/conflictAwareProductScheduler.test.js` exits with status 0.
- [x] `npm test` exits with status 0.
- [x] `npm run check` exits with status 0.
- [x] `npm run build` regenerates `public/blog.json` and `public/index.html`.
- [x] `public/blog.json` contains `CONF1` with `release`-style public blog registration through the build output.

## Evidence Collection
- Command evidence:
  - `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false test/toys/2026-06-15/conflictAwareProductScheduler.test.js` -> `8 passed`
  - `npm test` -> `585 suites, 3088 tests`
  - `npm run check` -> `check-suite passed`
  - `npm run build` -> regenerated `public/blog.json` and `public/index.html`
- Command log path: `artifacts/toys/conflict-aware-product-scheduler/commands.log`
- Generated artifacts:
  - `public/blog.json`
  - `public/index.html`
- Test report path (if applicable): `artifacts/toys/conflict-aware-product-scheduler/test-report.txt`

## Pass/Fail Rules
- Pass when the scheduler test, repo test gate, repo check gate, and build output all verify the new public toy registration.
- Fail when any command exits non-zero, the scheduler ranking assertions fail, or the public blog artifacts do not include `CONF1`.
