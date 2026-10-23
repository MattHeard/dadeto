# AlgZoo coverage-cost analysis boundary

- **Unexpected hurdle:** The first impact-check attempt included new documentation in path selection, which correctly forced the conservative all-unit fallback and skipped changed-core coverage.
- **Diagnosis:** The fallback test result was useful regression evidence but not enough for the Bead's changed-core coverage acceptance. An explicit source-and-test path run selects the scoped evaluator.
- **Chosen fix:** Keep the analysis pure, retain all 16 target-pair records, calculate each resource dimension separately, and report incomplete cost or degenerate bootstrap cases as not estimable. Tests use synthetic records only. The protocol now pins the 10,000-resample xorshift32 method before any assignments or outcomes.
- **Next-time guidance:** For `src/core` work, inspect `scopedCoverage` in `check:impact:run` output; it must list every changed core file with no uncovered statements or branch arms. `npm run check` remains the required local gate, and GitHub Full Check is authoritative for full coverage.
