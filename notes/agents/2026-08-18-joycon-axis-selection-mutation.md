# JoyCon axis-selection mutation slice

- Unexpected hurdle: the initial selection scan left one survivor when candidate and best magnitudes were equal.
- Diagnosis path: a bounded scan over `joyConMapper.js:1244-1254` isolated the strict `>` comparison.
- Chosen fix: added an identity assertion proving that an equal-magnitude candidate does not replace the existing best capture.
- Evidence: the final bounded Stryker run killed all 10/10 mutants; focused Jest passed 43 tests; targeted ESLint and diff checks passed.
- Next-time guidance: assert object identity for tie-breaking selectors, not only structural equality.
