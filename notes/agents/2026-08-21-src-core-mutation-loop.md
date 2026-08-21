# src/core mutation loop continuation

- Progress: audited the committed 350-file inventory and resumed current-worktree mutation testing.
- Unexpected hurdle: default Stryker runs select the full repository test surface; even the dedicated suite incurred substantial per-mutant startup cost and memory pressure.
- Diagnosis: the prior `createSectionSetter.js` survivor report identified a redundant `hasParsedData` wrapper; current source now uses the discriminant directly.
- Fix: removed the dead wrapper and verified the dedicated Jest suite (7 tests) and lint pass.
- Next time: add a supported bounded mutation-test configuration or use the repository’s resumable scanner with a fresh commit-scoped ledger before continuing the remaining files.
- Follow-up: `captureLifecycleShared.js` gained an explicit inactive-state assertion, but its focused Stryker run still hit child-process OOM after 2/18 mutants; keep the file unverified until a complete report succeeds.
