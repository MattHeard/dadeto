# Dependency-cruiser violation collector arity

- **Unexpected hurdle:** The generic core-file collector combined traversal, path identity, source reading, scanning, and violation creation as seven effective inputs.
- **Diagnosis path:** The focused dependency-cruiser suite covers Math.random source scanning, traversal, relative violation paths, empty scans, and fresh results. A no-cache inventory isolated the collector as the next finding.
- **Chosen fix:** Separated a four-input core JavaScript file-list capability from a three-input per-file scanner/projector, then made the collector compose those two capabilities.
- **Evidence:** `test/core/scripts/check-depcruise.test.js` passed (1 suite, 44 tests); target ESLint, TSDoc, and `git diff --check` passed. Fresh no-cache `src/core` inventory fell from 4 findings/4 files to 3/3; artifact `.tmp/parameter-bag-global-after-depcruise-collector.json`. Elevated `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates, including 11 E2E tests, zero clones, and zero audit vulnerabilities; log `.tmp/npm-check-depcruise-collector-arity.log`. `TMPDIR=/home/matt/dadeto/.tmp npm run build` passed; log `.tmp/build-depcruise-collector-arity.log`.
- **Next-time guidance:** Continue from `src/core/scripts/check-overexposed-exports.js:517` (effective arity 5). Keep source file listing independent from per-file policy scanning.
