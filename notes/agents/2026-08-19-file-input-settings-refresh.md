# File-input settings mutation refresh

- Unexpected hurdle: the aggregate report still listed two survivors although the current file had already been covered by a focused mutation test.
- Diagnosis: the fresh scan found only four configured ignored static mutations and no executable survivors.
- Chosen fix: no source or test change was needed; the stale aggregate entry was superseded by the current file-scoped result.
- Evidence: the corrected Stryker scan for `src/core/browser/inputHandlers/fileInputSettings.js` executed 4 mutations with 0 executable survivors and 0 timeouts; all four report entries were configured ignored static mutations. Focused Jest passed 1 test, targeted ESLint passed with zero warnings, and `git diff --check` passed.
- Next-time guidance: refresh aggregate entries before editing small files; preserve existing focused mutation tests when the current scan is already clean.
