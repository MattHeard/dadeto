# Object-minute rental search effects

- Unexpected hurdle: this endpoint had response writes gated but still constructed Firebase Admin/Firestore/Storage at module startup and called Firestore/GCS read adapters without forwarding the HTTP capability.
- Diagnosis: traced the cloud entrypoint through the search application and HTTP request executor; the Firestore repository performed a query plus batched `getAll`, and the schedule provider called GCS `download`.
- Fix: startup SDK resource creation now runs in a synchronous AllowEffects startup boundary; permission-first adapter functions wrap initialization/client creation. The request token is now required and forwarded through search, Firestore repository reads, batched reads, and GCS schedule download. The in-memory browser repository accepts the shared interface without changing its read behavior.
- Verification: focused Jest suites passed (4 suites / 76 tests); JSDoc type check and non-core line-budget check passed; full `npm run check` passed (coverage, 11 local E2E tests, all 10 gates, 0 clones, 0 audit vulnerabilities); `npm run build:cloud` passed.
- Next time: continue the lexicographic source-cloud effect audit after `object-minute-rental-search`; retain a fresh request capability per HTTP invocation and keep startup capabilities scoped to resource composition.
