# Interpretability context retrieval loop

- Unexpected hurdle: the first aggregate check found two duplication clones in the new retrieval path.
- Diagnosis: graph input validation repeated the exporter guard, and experiment/evidence status warnings repeated the same construction.
- Fix: extracted shared graph validation and status-warning helpers; the full check then reported zero clones.
- Evidence: focused graph tests passed with installed Zod and with `DADETO_TEST_WITHOUT_ZOD=1`; `npm run tsdoc:check`, focused ESLint, and `npm run duplication` passed. Final `npm run check` passed all 10 gates, including 100% line, statement, function, and branch coverage, zero duplication clones, and 11/11 browser checks. Coverage artifact: `reports/coverage/coverage-summary.json`; duplication artifact: `reports/duplication/jscpd-report.json`.
- Next-time guidance: keep Zod optional in tests by exercising both the installed-library path and the fallback path; for new graph queries, preserve source edges and provenance rather than synthesizing relationships.
