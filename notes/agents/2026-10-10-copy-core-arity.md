# Core copy parameter-bag cleanup

- Unexpected hurdle: the copy workflow passes structured plans between layers, so flattening every record would obscure the copy sequence and create wide callback signatures.
- Diagnosis: the arity findings centered on four functions that combined copy adapters, paths, logging, and orchestration. The cohesive top-level `RunCopyOptions` record is a workflow input; the smaller per-file operations can use explicit values and a focused paths record.
- Fix: made per-file copying explicit, separated source/target directories and paths, and kept the run plan named. Added an output-order assertion for directory, declared-file, and individual-file copies.
- Evidence: focused copy Jest suites (4 suites, 58 tests), scoped ESLint, TSDoc, cloud build, and all 10 `npm run check` gates passed. Fresh no-cache scan is `.tmp/parameter-bag-global-after-copy.json` (0 findings in `src/core/build/copy.js`; 103 remain globally).
- Next guidance: take one of the tied three-finding clusters from the fresh report: `src/core/browser/inputHandlers/lifeSeedHandler.js`, `src/core/cloud/submit-new-page/submit-new-page-core.js`, or `src/core/local/gcp-simulator/simulator.js`.
