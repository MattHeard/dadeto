# mutant:worktree directory support

- Unexpected hurdle: the repo-wide `npm test` gate still fails on existing global coverage thresholds even after the new directory support passes its focused tests.
- Diagnosis path: verified the worktree runner tests directly, then ran `npm test` to confirm the failure is coverage-baseline related rather than caused by the new path plumbing.
- Chosen fix: added optional `mutateTargetDir` plumbing through `src/local/run-stryker-worktree.js` and `src/core/scripts/run-stryker-worktree-core.js`, and covered the generated config output in unit tests.
- Next-time guidance: if the goal is only to scope mutation to a folder, keep the wrapper API thin and pass the directory through the generated Stryker config instead of changing the worktree layout.
