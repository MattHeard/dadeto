# CSV parser lint cleanup

- **Challenge:** Reducing the cyclomatic complexity of `parseCsvLine` without introducing eslint disable comments while keeping quote-handling logic intact.
- **Approach:** Reimplemented the parser as a small state-machine class so each method stays below the complexity threshold, and extracted delimiter helpers to keep conditions simple.
- **Outcome:** Lint warning in `src/core/toys/utils/csv.js` cleared while preserving existing behaviour (verified with the CSV utility tests).
