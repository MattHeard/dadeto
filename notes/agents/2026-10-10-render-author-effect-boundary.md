# Render-author effect boundary

- Unexpected hurdle: the first full check found one uncovered function in `run.js`: the delete-sentinel callback was ignored by the mocked handler in the trigger-wiring test.
- Diagnosis: the core effect migration changed the handler signature to receive `AllowEffects`, but the run test mock did not invoke every callback passed to the handler factory.
- Fix: move Storage save and author-document update into permission-first adapters under `src/cloud/render-author`; the cloud trigger boundary now mints a fresh token per event and core forwards it to both adapters. Extend the run test mock to invoke and assert the delete-sentinel callback.
- Evidence: focused Jest passed (3 suites, 17 tests); the follow-up run test passed. `npm run lint`, `npm run tsdoc:check`, `npm run build:cloud`, and `git diff --check` passed. The first full check exposed the coverage gap; after fixing it, `npm run check` passed all 10 gates, with 100% branch/function/line/statement coverage, local E2E 11/11, 0 clones, and 0 vulnerabilities. Final check log: `.tmp/npm-check-render-author-effects-final.log`.
- Next time: for trigger-boundary migrations, keep the runtime wiring test mock exercising every injected callback, including sentinel factories, before launching the full coverage suite.
