# Scoped impact diagnostic exit status

- **Unexpected hurdle:** The first full fast check found one clone in the new coverage-failure branch because it repeated the executor's existing failure-state assignment.
- **Diagnosis:** Scoped coverage correctly identified uncovered or missing changed-core locations, but `check:impact:run` had no test requiring those findings to fail the command. Duplicating the existing failure assignment also violated the zero-clone gate.
- **Fix:** The executor now combines static-gate failures, coverage-report errors, uncollected changed files, and uncovered statements or branch arms into one failure decision. Its JSON report retains each changed file and uncovered line/branch-arm location. The evaluator guide documents the failure behavior.
- **Next time:** Keep changed-core diagnostics fail-closed when coverage cannot be collected. Keep the full `npm run check:full` workflow as the authority for global coverage and E2E.
- **Evidence:** `npm run test:impact -- --files test/scripts/plan-check-impact.test.js` passed (1 suite, 30 tests); targeted ESLint and `git diff --check` passed; `npm run duplication` reported 0 clones. `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 fast local gates across five impact shards (959 suites, 6,597 tests), with 0 clones and 0 audit vulnerabilities. Matching Full Check is pending after push.
