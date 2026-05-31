## Depcruise, Duplication, and Coverage Fix

Unexpected hurdle: restoring the depcruise and duplication fixes caused a small branch-coverage drop in `src/core/local/process-launcher.js`.

Diagnosis path: the full Jest coverage run pointed at missing branches in the shared launcher helper, then focused helper tests showed the uncovered paths were the default fs/spawn fallbacks plus the custom resolver branches and exit-payload normalization.

Chosen fix: added small, direct tests for `render-support`, `process-launcher`, and the Notion/Symphony launchers so the shared helper branches are exercised without widening the implementation again.

Next-time guidance: when refactoring shared helpers, add one targeted helper test file early for each fallback branch family so coverage regressions are easier to localize.
