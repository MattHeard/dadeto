# Mutation completion: tree-visibility core

- Unexpected hurdle: the initial scan found redundant threshold guards, an untested null snapshot, and an infinite loop-body mutant.
- Diagnosis: the threshold guards were mathematically redundant; the null snapshot was a missing boundary case; Stryker's empty loop-body mutant cannot terminate.
- Fix: removed the dead threshold branches, added null-snapshot assertions, and documented a narrowly scoped suppression for the non-static infinite loop-body mutant.
- Evidence: final focused mutation scan instrumented 34 mutants, killed 33, ignored only the documented loop mutant, and had 0 survived and 0 timed out. ESM-aware focused Jest passed 8 tests.
