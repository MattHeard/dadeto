# Conway Life state arity cleanup

- Unexpected hurdle: none. The finding came from `createNextState` receiving a five-field configuration object and reading all fields separately.
- Diagnosis: next tick speed is a property of the current `LifeState`; passing it separately duplicated state instead of expressing a distinct dependency.
- Fix: apply the normalized next speed to a prepared base state in `buildNextState`, then pass the base state, frames per tick, seed cells, and reset flag as four explicit inputs to `createNextState`.
- Evidence: `test/toys/2026-06-22/conwayLife.test.js` passed (22 tests); target ESLint, TSDoc, and focused no-parameter-bag scan passed; fresh global inventory fell from 24 findings/24 files to 23/23 (`.tmp/parameter-bag-global-after-conway-life.json`) with no finding in the target file; `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates including 11 local E2E tests, 0 clones, and 0 audit vulnerabilities; `TMPDIR=/home/matt/dadeto/.tmp npm run build` passed; `git diff --check` passed.
- Next time: inspect `src/core/browser/toys/2026-06-28/batteryBreakout.js:720` from the fresh scan; preserve game behavior and avoid suppressions or superficial repacking.
