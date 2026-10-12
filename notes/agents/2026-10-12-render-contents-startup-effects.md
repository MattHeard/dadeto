# Render contents startup effects

- Unexpected hurdle: the first refactor retained the startup capability in a dependency bag and minted a separate unused token in the trigger adapter. The capability lint correctly rejected the captured token.
- Diagnosis: startup effects must receive `AllowEffects` as a direct function argument all the way through core composition; cloud registration adapters must consume that same token.
- Fix: initialization now runs inside the cloud startup boundary; Firestore is resolved after initialization with a no-op ensure callback; core receives the startup token directly and forwards it to the trigger registration adapter. Runtime handlers continue to bind fresh invocation capabilities.
- Verification: focused render-contents tests passed (4 suites, 14 tests); `npm run tsdoc:check`, targeted ESLint, `npm run non-core-thin`, full `npm run check` (10/10 gates, including coverage and local E2E), `npm run build:cloud`, generated-file `node --check`, and `git diff --check` passed.
- Next-time guidance: thread composition capabilities as direct parameters, never in dependency objects or closures. The next source-cloud audit target after `render-contents` is `src/cloud/report-for-moderation/index.js`.
