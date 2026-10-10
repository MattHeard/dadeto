# Render contents request handler composition

- Unexpected hurdle: the initial staged refactor removed the response writer from `buildHandleRenderRequest`, but that function also sends success and failure responses; focused tests and TSDoc caught the missing capability. The entrypoint test mock also needed to model the newly explicit authorization function.
- Diagnosis: authorization should be created at composition time, while the handler still needs its own response-writing capability. Four explicit collaborators fit the existing parameter limit.
- Fix: `buildHandleRenderRequest` now receives validation, authorization, render, and response-writing functions directly. The cloud entrypoint constructs the authorization capability and passes all four collaborators.
- Evidence: focused render-contents Jest passed (4 suites, 74 tests); fresh no-cache scan reports zero findings in `render-contents-core.js`; repository-wide scan reports 140 findings across 88 files, with `process-new-page-core.js` the largest cluster at 11; `npm run check` passed all 10 gates; `npm run build:cloud` passed. Logs and scan artifact are in `.tmp/`.
- Next-time guidance: start with `resolveIncomingOptionContext` in `process-new-page-core.js`, keeping Firestore reference validation and null/skip semantics intact.
