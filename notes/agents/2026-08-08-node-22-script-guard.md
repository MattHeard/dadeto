# Node 22 npm-script guard

- Unexpected hurdle: the worktree's Node runtime is 18.20.4, so the required `npm run check` gate cannot execute its existing checks.
- Diagnosis: `engines` previously allowed Node 20 and would only warn; an explicit guard is needed for immediate runtime failure.
- Chosen fix: add `scripts/check-node-version.js`, invoke it before the root `check`, `test`, and `build` entry points, and require Node >=22 via `engines`.
- Next-time guidance: run the quality gate under Node 22+ and extend the guard to any newly added top-level script entry point.
