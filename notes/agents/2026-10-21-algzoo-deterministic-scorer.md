# AlgZoo deterministic local prediction scorer

## Unexpected hurdle

The first scorer draft failed four local gates: core parsing classification, JSDoc types, lint complexity, and jscpd duplication. The source classifier treats standalone logic files as raw parsing boundaries, and the first implementation repeated numeric-result and held-out-matrix handling.

## Diagnosis and fix

Kept the scorer in `src/core` under its own `index.js` entrypoint, re-exported by the AlgZoo pilot harness. Moved sequence, time, and node-count context into one evaluator state, and extracted shared finite-result and matrix readers. Added tests for both comparator outcomes, strict fields, node limits, malformed/cyclic rules, invalid input prefixes, and the three independent score thresholds.

The protocol advanced to v1.0.2 to freeze metric details: the constant-mean benchmark is the arithmetic mean of the 10,240 held-out activations for one target; standard deviation is population standard deviation over those same values; aggregate and per-step RMSE use `max(stddev, 0.01)` as the scale. This evaluator-only statistic is calculated after submissions lock and is never sent to investigators.

## Evidence and next-time guidance

The focused scorer suites passed 2 suites / 16 tests. `npm run check:impact:run -- --files src/core/interpretability/algZooPredictionScorer/index.js src/core/interpretability/algZooPilotHarness/index.js test/core/interpretability/algZooPredictionScorer.test.js test/core/interpretability/algZooPilotHarness.test.js` passed: five related suites / 31 tests, changed-core lines and branches fully covered, ESLint, core-parse, and duplication (0 clones). `npm run check` passed all 10 gates and five serial fallback shards: 979 suites / 6,873 tests, 0 clones, 0 audit vulnerabilities. Only synthetic held-out values were used; no pilot assignment, real outcome access, or target inference occurred.

Keep actual target activations outside the pure scorer and pass them as a precomputed evaluator-only dataset. Freeze changes to metric semantics in a new preregistration version before any assignment or outcome access. Rank 4 acceptance criterion 5 remains open until causal-intervention results are persisted separately from hypotheses; this scoring slice does not establish causal evidence.
