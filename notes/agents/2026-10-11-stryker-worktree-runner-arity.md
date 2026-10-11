# Stryker worktree command runner arity

- Unexpected hurdle: the first `npm run check` attempt hit sandbox `EPERM` while spawning Node and could not reach the npm audit registry.
- Diagnosis: both failures were environment restrictions; the reviewed elevated retry completed the same checks successfully.
- Fix: bound the worktree process, logger, and base environment adapters once in `createLoggedCommandStepRunner`; keep per-command environment overrides and command data explicit at invocation.
- Evidence: focused runner Jest passed (3 suites, 12 tests); target ESLint and `npm run tsdoc:check` passed; fresh no-cache inventory fell from 2 findings in 2 files to 1 in 1 file. Artifact: `.tmp/parameter-bag-global-after-stryker.json`. Elevated `npm run check` passed all 10 gates, including 11 E2E tests, 0 clones, and 0 audit vulnerabilities; log `.tmp/npm-check-stryker-runner-arity-elevated.log`. `npm run build` passed; log `.tmp/build-stryker-runner-arity.log`. `git diff --check` passed.
- Next time: inspect `createWriteCoverageSummaryHandle` and its local composition boundary at `src/core/scripts/write-coverage-summary.js:24`. Preserve missing-file errors, custom paths, summary projection, and the AllowEffects write boundary while splitting the six-input configuration into named responsibilities.
