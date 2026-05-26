# Lint warning reduction loop

- **Unexpected hurdle:** The project enforces a cyclomatic complexity maximum of 2 plus strict JSDoc completeness, so straightforward refactors still left many warnings.
- **Diagnosis path:** Ran `npm run lint`, inspected `reports/lint/lint.txt`, and focused on the two highest-warning files under `src/core/local`.
- **Chosen fix:** Reduced warning count by extracting state-store read/write helpers, simplifying guard logic, and adding targeted JSDoc in `stateStore.js` and `run.js`.
- **Next-time guidance / open questions:** Consider relaxing complexity/JSDoc thresholds for internal utility modules or adding shared helper utilities to avoid repetitive guard/JSDoc boilerplate.
