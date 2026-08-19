# Audio-controls mutation refresh

- Unexpected hurdle: the aggregate scan listed one survivor, but the current file-scoped scan was clean; the focused Jest run also surfaced transient haste-map warnings from a Stryker sandbox package.
- Diagnosis: the persisted survivor entry was stale; the sandbox warning did not affect the test result.
- Chosen fix: no source or test change was needed because the current behavior was already fully covered.
- Evidence: the correctly scoped Stryker scan for `src/core/browser/audio-controls.js` executed 40 mutants and killed all 40 with 0 survivors and 0 timeouts. Focused Jest passed 28 tests; targeted ESLint passed with zero warnings; `git diff --check` passed.
- Next-time guidance: use the actual test path from `rg --files`; treat transient Stryker sandbox haste warnings separately from test failures and refresh stale aggregate reports before editing.
