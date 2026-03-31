# 2026-03-31 final-two globs branch-100 follow-up

- **Unexpected hurdle:** Removing two more ignore globs initially dropped total branch coverage because a tiny pair of joyCon toy branches remained uncovered.
- **Diagnosis path:** Re-ran full coverage, queried `coverage-final.json` for uncovered branch IDs, and mapped misses to `normalizeLocalPermanentDataRoot` and `uniquePush` cases.
- **Chosen fix:** Added two focused `joyConMapper` tests (null permanent data root and missing skip key) and kept Symphony helper fallbacks covered through focused unit tests.
- **Next-time guidance:** Keep a quick branch-map query loop handy after each glob removal; small uncovered branches are faster to close than reverting globs.
