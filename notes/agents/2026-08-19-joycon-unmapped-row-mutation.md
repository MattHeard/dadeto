# JoyCon unmapped-row mutation slice

- Unexpected hurdle: `getUnmappedRowState` had survivors even though the public row-state test covered skipped rows.
- Diagnosis: the test did not distinguish the non-skipped active path from the non-current and not-started optional paths.
- Chosen fix: added focused assertions for all three pending-state outcomes while retaining skipped-row precedence coverage.
- Evidence: the targeted Stryker scan for lines 1369-1375 killed 5/5 mutants with 0 survivors and 0 timeouts; the focused Jest suite passed 89 tests and ESLint passed with zero warnings.
- Next-time guidance: mutation-scan each row-state branch independently before moving to the next helper.
