# Blog-key handler mutation slice

- Unexpected hurdle: the broad file scan was unusually slow on this host, although it remained serial and resource-bounded with no timeouts.
- Diagnosis: the existing tests asserted textarea configuration but did not assert the title input’s placeholder; the persisted survivor report also pointed at title parsing and title-update behavior.
- Chosen fix: asserted the title input type and `Blog post title` placeholder alongside the existing title parse and update coverage.
- Evidence: the final Stryker scan for `src/core/browser/inputHandlers/blogKeyHandler.js` executed 38 mutants and killed all 38 with 0 survivors and 0 timeouts; six configured ignored mutations remained non-executable. Focused Jest passed 21 tests, targeted ESLint passed with zero warnings, and `git diff --check` passed.
- Next-time guidance: keep broad scans serial on this host; a clean scan may still take more than ten minutes even without timeouts.
