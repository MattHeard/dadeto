# Interpretability experiment submission loop

- Unexpected hurdle: the first full check found one uncovered statement and six uncovered branches in the new append API.
- Diagnosis: tests covered populated graph collections, but not invalid existing graphs, omitted graph arrays, or omitted submission edges.
- Fix: added focused cases for those exact paths. The append API validates experiment, evidence, and edge records through injected schemas; validates the resulting graph; and only returns a new graph after all checks pass, leaving the caller's graph untouched on failure.
- Zod boundary: schemas are supplied by the caller. Focused tests passed with installed Zod and with `DADETO_TEST_WITHOUT_ZOD=1`; tests do not require the Zod package.
- Evidence: focused suites passed 2 suites / 26 tests in each Zod mode; `npm run tsdoc:check` passed. Final `npm run check` passed all 10 gates with 100% line, statement, function, and branch coverage, zero duplication clones, and 11/11 browser checks. Artifacts: `reports/coverage/coverage-summary.json` and `reports/duplication/jscpd-report.json`.
- Next-time guidance: when adding pure graph APIs, include tests for omitted collections and malformed source state early; keep storage and authenticated writes outside `src/core`.
