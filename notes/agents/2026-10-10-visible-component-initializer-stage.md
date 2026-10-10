# Visible component initializer stage

- Unexpected hurdle: the first focused Jest invocation lacked the repository's VM module setup, then the default shared `/tmp` transform cache was full. Rerunning Jest with VM modules, no cache, and the repo-local temp directory worked.
- Diagnosis: `initializeVisibleComponents` unpacked four services from its environment alongside the observer creator, exceeding the effective-arity limit even though the environment remains stable while selecting an observer factory.
- Fix: capture the environment in `createVisibleComponentsInitializer` and pass the observer creator to its returned stage. Preserve the exported `(env, createIntersectionObserver)` wrapper.
- Evidence: focused Jest passed 2 suites / 51 tests. Fresh no-cache arity scan removed the target; `toys.js` now has 1 finding. `npm run lint`, `npm run tsdoc:check`, and `git diff --check` passed. Full `npm run check` passed all 10 gates; coverage 100% for branches/functions/lines/statements, local E2E 11/11, 0 clones, 0 vulnerabilities. Full check log: `.tmp/npm-check-visible-components-stage.log`.
- Next time: continue with the fresh remaining `toys.js` finding, `createRenderer`.
