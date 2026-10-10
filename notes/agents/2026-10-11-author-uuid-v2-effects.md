# Author UUID V2 effects boundary

- Unexpected hurdle: the existing handler tests call the internal handler directly, so they needed explicit capabilities and injected adapters after the signature became permission-first.
- Diagnosis: focused tests identified the direct write and response paths; the cloud entrypoint was the correct place to mint a fresh capability for each HTTP request.
- Chosen fix: pass the capability through UUID resolution, route the merge write and JSON response through cloud adapters, and test that each request receives a distinct token.
- Next-time guidance: keep Firestore reads in core when they do not mutate state; inject writes and response operations explicitly, and preserve the merge option in adapter tests.
- Evidence: focused Jest passed (3 suites, 7 tests); `npm run lint`, `npm run tsdoc:check`, and `npm run build:cloud` passed. `TMPDIR=/home/matt/dadeto/.tmp/check-tmp npm run check` passed its test/coverage group and all 10 repository gates, with 0 clones and 0 vulnerabilities; `.tmp/npm-check-get-author-uuid-v2-effects.log`.
