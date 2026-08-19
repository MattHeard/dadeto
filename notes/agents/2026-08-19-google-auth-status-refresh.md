# Google-auth status mutation refresh

- Unexpected hurdle: the aggregate survivor list still reported three survivors for this file even though the current branch had already received the corresponding focused assertions.
- Diagnosis: a fresh file-scoped scan was required; the persisted aggregate entry was stale.
- Chosen fix: no source or test change was needed because the current behavior was already fully exercised.
- Evidence: `npx stryker run --mutate 'src/core/browser/google-auth-status.js' --testFiles 'test/core/browser/google-auth-status.test.js' --inPlace --concurrency 1 --timeoutMS 30000` executed 42 mutants and killed all 42 with 0 survivors and 0 timeouts. The existing focused Jest and lint evidence remains recorded in the earlier status mutation note.
- Next-time guidance: refresh persisted survivor entries before treating them as actionable; do not add redundant tests when a current clean scan disproves the stale report.
