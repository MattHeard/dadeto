# Generate stats arity loop

- Unexpected hurdle: The sandbox denied subprocess creation for the coverage runner and blocked npm audit network access.
- Diagnosis: The first full check failed only at those environment boundaries; the same check completed with elevated permissions.
- Chosen fix: Replaced parameter destructuring in `createGenerateStatsCore` with explicit reads from its named dependency record, preserving the undefined-only default for `verifySchedulerRequest`.
- Evidence: The two focused generate-stats suites passed (63 tests); the target lint and TSDoc checks passed. The elevated `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates, 11 E2E tests, 100% line/statement/function/branch coverage, zero clones, and zero audit vulnerabilities. The cloud-only parameter-bag lint inventory fell from 7 findings to 6.
- Next-time guidance: Use the workspace-local `TMPDIR` for full checks and request elevation when sandbox restrictions block child processes or npm audit. Next inventory candidate: `hide-variant-html/hide-variant-html-core.js`.
