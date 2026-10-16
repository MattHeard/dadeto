# Agent reuse notes

- Unexpected hurdle: the new core-local validator initially missed the global 100% branch threshold by one path, even though its focused tests passed.
- Diagnosis: the aggregate coverage run exercised `hasText()` with a non-string malformed friction detail; the test did not yet cover that rejection branch.
- Fix: add the malformed record case, then rerun `npm run check` to terminal success. The fifth aggregate passed all 10 gates, including 100% coverage, and reported zero clones.
- Next time: run the full evaluator after characterization tests even when focused tests pass; preserve the machine-readable evidence and exact terminal command in the bead before closing.
