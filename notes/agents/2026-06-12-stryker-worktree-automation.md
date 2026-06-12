# Stryker Worktree Automation

- Unexpected hurdle: full mutation runs were competing with the main checkout and hitting memory pressure on the shared machine.
- Diagnosis path: confirmed the host only has 4 GiB RAM, saw Stryker child restarts from OOM, and noted that the main workspace was still the right place for normal editing while mutation ran.
- Chosen fix: added `npm run mutant:worktree`, which creates a temporary git worktree, runs Stryker there, copies `reports/mutation/` back to the main checkout, and removes the worktree automatically.
- Next time: if the worktree install becomes too slow, the next refinement is to reuse a shared dependency cache or preseed the worktree with a symlinked `node_modules` strategy.
