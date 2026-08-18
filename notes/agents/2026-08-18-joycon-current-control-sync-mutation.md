# JoyCon current-control synchronization mutation slice

- Unexpected hurdle: `syncCurrentControlFromIndex` had only indirect lifecycle coverage.
- Diagnosis path: the bounded scan over lines 1684-1689 found two survivors in the assignment and nullish fallback.
- Chosen fix: asserted both a valid control index and an out-of-range index directly.
- Evidence: the verification scan killed both mutants; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: test state-mutating synchronizers with both valid and missing lookup results.
