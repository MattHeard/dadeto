# Mark variant dirty HTTP response effects

- Unexpected hurdle: full check caught a 99.992% branch score because the forbidden response path was not exercised; lint also caught an overpacked response helper and a five-argument handler resolver.
- Diagnosis: making the response adapter required added an options branch; the test wrapper had hidden the original undefined-options path, and the integration cases lacked a non-admin request.
- Fix: pass the already validated response adapter through the handler config, preserve the no-options test against the core factory, split the response action from its mutation details, and exercise all HTTP response outcomes with fresh frozen invocation tokens. Added an entrypoint regression that also protects adapter imports/wiring.
- Evidence: focused suites passed (5 suites / 73 tests); `npm run lint` and `npm run tsdoc:check` passed; full `npm run check` passed all 10 gates and coverage; `npm run build:cloud` passed.
- Next: gate the remaining mark-variant-dirty authorization diagnostics/logging, then continue the source-cloud AllowEffects audit.
