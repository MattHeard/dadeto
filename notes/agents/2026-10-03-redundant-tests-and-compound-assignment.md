# Redundant tests and compound assignment

Consolidated six user-identified duplicate cases in toys, audio controls, observer logging, process launcher, tic-tac-toe, and Conway Life. Retained stronger argument assertions and equivalent setup/cleanup. The six suites pass with 141 tests. Comparing statement, function, and branch covered-location masks against the pre-deletion baseline shows no changes across the five affected source modules: `.tmp/redundant-test-coverage-comparison.log`.

The focused coverage command still fails the global threshold because these suites alone do not cover the whole toy framework and process launcher. This was also true before consolidation; do not weaken thresholds to make a partial evaluator green. Run the full aggregate for global evidence.

Moved the compound assignment adapter into the existing conditional assignment factory while retaining its public re-export, rejection precedence, atomic write, and original String coercion policy. An explicit compound identity helper avoids duplicating atomic-commit structure without adopting the single-assignment empty-string fallback. All 1,217 toy tests pass; the factory and persistence boundary have exact 100% coverage in all four metrics (`.tmp/conditional-compound-adapter-final-tests.log`).

Static `npm run check -- --skip-tests` passes nine gates; duplication alone fails at 116 clones, down from 117 (`.tmp/conditional-test-consolidation-static.log`). The parent clone-elimination goal remains open. No configuration exemptions, ignores, or threshold relaxation were introduced.

Full aggregate at checkpoint `0217096fc7`: `TMPDIR=/home/matt/dadeto/.tmp DADETO_COVERAGE_SHARD_SIZE=40 npm run check` completed with exit 1 solely for duplication (116 clones). All unit shards and all nine browser tests passed. Exact merged coverage: lines 19,971/19,971; statements 20,776/20,776; functions 6,910/6,910; branches 9,796/9,796. Evidence: `.tmp/redundant-test-consolidation-full-check.log` and `reports/coverage/coverage-summary.json`. The six-test consolidation is complete; the parent goal is not.
