# run-stryker-worktree-core coverage

- Unexpected hurdle: the existing defaults test has a top-level-await parse failure under the repository Jest configuration.
- Diagnosis: the production module's remaining uncovered paths were dependency defaults and the reused-worktree/allow-failure branches, which can be exercised without that malformed test.
- Fix: added isolated tests for default dependency construction, reused worktrees, cleanup spawn errors, and allowed nonzero exits.
- Evidence: strict focused Jest coverage passed at 100% statements, branches, functions, and lines.
- Next time: run the focused valid test set explicitly when neighboring dirty tests cannot be parsed.
