# JoyCon axis-reduction mutation slice

- Unexpected hurdle: the initial scan left one survivor in the merge helper's conditional path.
- Diagnosis path: a bounded scan over `joyConMapper.js:1209-1234` isolated `mergeAxisCaptureCandidate` behavior for null and non-null candidates.
- Chosen fix: exported the merge helper for focused tests and asserted both null preservation and candidate delegation.
- Evidence: the final bounded Stryker run killed all 9/9 mutants; focused Jest passed 44 tests; targeted ESLint and diff checks passed.
- Next-time guidance: directly test reducer merge helpers with both empty and populated accumulator states.
