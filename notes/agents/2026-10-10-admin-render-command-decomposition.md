# Admin render command decomposition

- Unexpected hurdle: TSDoc first exposed that the action needed the precise render endpoint shape, then that the shared token-action callback context advertises a broader `Promise<object>` endpoint. The action now accepts the shared context and narrows the endpoint only at the call to `postTriggerRenderContents`.
- Diagnosis path: render-focused tests cover HTTP success/failure and thrown errors; the parameter-bag diagnostic confirmed all four render-flow findings disappeared. TSDoc and full quality gates passed after the context type was aligned.
- Chosen fix: bind status/error reporters in `createTriggerRenderAction`, remove the duplicate render core, and keep `executeTriggerRender` and `createTriggerRender` as configuration facades. The action explicitly forwards its permission to the existing permission-first POST helper.
- Evidence: focused Jest passed (4 suites, 132 tests); per-file parameter-bag diagnostic fell from 14 to 10; `npm run lint` and `npm run tsdoc:check` passed; elevated `DADETO_COVERAGE_SHARD_SIZE=40 JEST_CACHE_DIRECTORY=/home/matt/dadeto/.tmp/jest_rs TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates, with 0 clones and 11/11 local E2E tests.
- Next: continue the remaining `admin-core.js` parameter-bag findings; global enforcement remains disabled until the full baseline is resolved.
