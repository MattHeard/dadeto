# Core ESLint boundaries

- Unexpected hurdle: enabling `no-console` across `src/core` exposed logging calls that were previously direct browser or simulator console access, including callbacks captured when modules load.
- Diagnosis: targeted core-wide ESLint identified the boundaries; full coverage then exposed logger-default branches that needed to be invoked before other tests mutated module-level dependencies.
- Fix: apply `no-console` and the restricted ambient-global list to every `src/core/**/*.js` file, inject console-shaped dependencies at runtime boundaries, and cover logger defaults and no-op behavior.
- Next time: when adding a core-wide lint rule, run the full coverage gate after targeted lint. Module-level closures should be exercised before tests that alter their shared dependencies.
- Evidence: `npx eslint 'src/core/**/*.js'`; `npm run lint`; `DADETO_CHECK_TIMEOUT_MS=3600000 npm run check` passed with 10 gates and zero failures. Coverage: lines 100%, statements 100%, functions 100%, branches 100%.
