# Hidden variant HTML storage effects

- Unexpected hurdle: the storage delete lived inside a path-removal helper several layers below the Firestore trigger, so adding a token only at the trigger would not have guarded the actual effect.
- Diagnosis: traced the trigger through visibility transitions, snapshot adaptation, path construction, and storage removal; identified the Cloud Storage delete as the only mutation in this slice.
- Chosen fix: minted a fresh capability through the invocation boundary, passed it through each removal stage, and injected the permission-first storage delete adapter from the cloud entrypoint.
- Next-time guidance: follow event-trigger capabilities all the way to the SDK operation; keep path validation and prefixing in core, but keep SDK mutation calls in the adapter.
- Evidence: focused Jest passed (5 suites, 47 tests); `npm run lint`, `npm run tsdoc:check`, and `npm run build:cloud` passed. `TMPDIR=/home/matt/dadeto/.tmp/check-tmp npm run check` passed the test/coverage group and all 10 gates, including 11/11 local E2E, 0 clones, and 0 vulnerabilities; `.tmp/npm-check-hide-variant-html-effects.log`.
