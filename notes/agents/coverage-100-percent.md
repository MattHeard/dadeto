# Coverage to 100 Percent

- Hurdle: the last coverage gap was not a failing test, but a few uncalled internal helpers and one presenter fallback path.
- Diagnosis: Jest's coverage summary showed `graphPlot.js`, `canvasDoodle.js`, and `run-stryker-worktree-core.js` still short after the suite was already green.
- Fix: added narrow tests for the JSON parse fallback, cleanup-error branch, and the unused random callback path, then raised `jest.config.mjs` thresholds to `100`.
- Next time: check the generated coverage artifact directly before widening tests; it points to the exact uncovered function or branch faster than guessing from source alone.
