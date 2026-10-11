# Atomic assignment plan arity cleanup

- Unexpected hurdle: `commitAssetCustodianAssignment` combined extraction of persistence settings, projection of two assignment records, the atomic write, and response serialization.
- Diagnosis: the function was passed a full request and an identifier object, then transformed both into a two-write transaction before persisting it.
- Fix: extracted `createAssetCustodianCommitPlan(request, ids)` as a pure transaction planner. `commitAssetCustodianAssignment(plan, env)` now performs the atomic append and serializes its result. Both legacy and validated compound assignment paths prepare the same plan.
- Evidence: three focused suites passed (37 tests); ESLint and TSDoc passed; target lint scan has 0 findings; global scan fell from 19 findings/19 files to 18/18 (`.tmp/parameter-bag-global-after-safe-assignment-persistence.json`); `npm run check` passed all 10 gates, including 11 local E2E tests and 0 clones; `npm run build` and `git diff --check` passed.
- Next time: start from the fresh global rule report. Next finding is `src/core/browser/toys/2026-08-22/strictAssignmentCore.js:48` (effective arity 6). Inspect its validated assignment decision path before editing.
