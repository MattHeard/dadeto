# Acceptance Criteria: Change Together Explorer

## Machine-Checkable Criteria
- [ ] `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false test/toys/2026-06-15/changeTogetherExplorer.test.js` exits with status 0.
- [ ] `npm test` exits with status 0.
- [ ] `npm run check` exits with status 0.
- [ ] `npm run build` regenerates `public/blog.json` and `public/index.html`.
- [ ] `public/blog.json` contains `CHAN1` with `release`-style public blog registration through the build output.

## Evidence Collection
- Command evidence:
  - `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false test/toys/2026-06-15/changeTogetherExplorer.test.js`
  - `npm test`
  - `npm run check`
  - `npm run build`
- Command log path: `artifacts/toys/change-together-explorer/commands.log`
- Generated artifacts:
  - `public/blog.json`
  - `public/index.html`
- Test report path (if applicable): `artifacts/toys/change-together-explorer/test-report.txt`

## Pass/Fail Rules
- Pass when the scheduler test, repo test gate, repo check gate, and build output all verify the new public toy registration.
- Fail when any command exits non-zero, the co-change ranking assertions fail, or the public blog artifacts do not include `CHAN1`.
