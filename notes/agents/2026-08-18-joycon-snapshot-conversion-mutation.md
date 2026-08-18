# JoyCon snapshot-conversion mutation slice

- Unexpected hurdle: the initial combined null/non-null test left three conversion mutants alive under per-test mutation coverage.
- Diagnosis path: split null handling and complete snapshot conversion into separate tests, then reran the full conversion range.
- Chosen fix: asserted null preservation independently from normalized button and axis arrays.
- Evidence: the final Stryker run killed all 5 mutants; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: keep null and populated-input mutation cases in separate tests for reliable test selection.
