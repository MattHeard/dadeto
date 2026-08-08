# dadeto-zyg remaining build TSDoc warning

- Unexpected hurdle: a shared `commonCore` adapter contract was tightened after the prior build cleanup, exposing one stale optional `readFile`/`writeFile` declaration in `copy-cloud.js`.
- Diagnosis path: the only current build diagnostic pointed to the injected async filesystem dependency at `createAsyncFsAdapters`.
- Chosen fix: marked the two required adapter methods as required in the local dependency typedef; runtime behavior is unchanged.
- Evidence: `npm run tsdoc:check` reports zero `src/core/build` diagnostics; `test/core/copy.test.js` passed 33 tests.
