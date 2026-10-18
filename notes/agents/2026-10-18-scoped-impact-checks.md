# Scoped impact check executor

- Unexpected hurdle: the first aggregate run caught a five-argument helper, missing child-process option typing, and a CLI file over the 50-line limit.
- Diagnosis: `npm run check` surfaced the `repo/no-parameter-bag-arity-smuggling`, TSDoc, and non-core-thin failures; `reports/lint/lint.txt` gave exact lint locations.
- Fix: pass the executable and argv as one command vector, type the spawn options with Node's string-encoding options, and keep the local CLI wrapper below its size limit.
- Next time: when related-test discovery falls back in a constrained environment, pass the test file directly for focused Jest validation; use `npm run check` to validate the whole changed worktree.
- Evidence: focused `test/scripts/plan-check-impact.test.js` passed 23/23; `npm run check` passed all 10 aggregate gates after the fixes.

## Full-check coverage follow-up

- Unexpected hurdle: Full Check run `39158636190` found two uncovered branch arms in `checkImpactPlan.js`, although all suites passed and statements, functions, and lines were 100%.
- Diagnosis: the fallback plan always carries a reason, and every selected plan always includes ESLint; defensive conditions for those impossible states left branches uncovered.
- Fix: represent fallback and selected plans as a discriminated JSDoc union, consume the fallback reason directly, and run ESLint unconditionally for selected plans.
- Next time: inspect the uploaded coverage detail when a full check fails, then encode planner invariants in the type contract instead of retaining unreachable defensive branches.
- Evidence: focused `test/scripts/plan-check-impact.test.js` passed 23/23 and focused ESLint passed; `npm run check` and a fresh Full Check are still running or pending.
