# Coverage Violations Fix

- Unexpected hurdle: the repo was already at 576/576 passing tests, but global coverage was still short by 0.02% on branches.
- Diagnosis path: I added focused tests for the new shared gate helper in `src/core/scripts/gate-utils.js` and the canvas parser in `src/core/browser/canvasDoodleCore.js`, then reran the full suite with coverage reporting to find the exact gap.
- Chosen fix: covered the remaining `executeStandardGate` violation branch without a message, which lifted global branch coverage to the threshold.
- Next-time guidance: when the suite is this close to the threshold, target the smallest uncovered branch in the newest shared helper before touching broader runner code.
