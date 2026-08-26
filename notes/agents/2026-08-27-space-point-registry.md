# Mutation checkpoint: space point registry

- Initial focused Stryker scan: 9 mutants, 1 non-static survivor, 1 static mutant, and 0 timeouts.
- Diagnosis: the registry summary count key was not asserted.
- Fix: added an assertion for `summary.spacePointCount` in the compatibility suite.
- Final evidence: 9 mutants, 8 killed, 1 static mutant ignored, 0 non-static survivors, and 0 timeouts; focused ESM-aware Jest passed 6 tests.
