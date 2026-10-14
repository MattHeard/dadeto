# Submit new page AllowEffects audit

## Findings

The `submit-new-page` cloud path keeps startup and request capabilities separate. Startup Firebase initialization, middleware and POST registration, and HTTPS endpoint registration receive the startup capability. The request wrapper mints a fresh capability per invocation and forwards it to the response adapter and core handler. The Firestore submission write is behind a permission-first `saveSubmission` adapter; the core passes the request capability through to it. Firestore reads, auth verification, UUID generation, and server-timestamp sentinel construction remain query or construction operations under the current policy. No unguarded command effect or captured startup token was found in this path.

## Evidence

- Focused tests: 6 suites, 30 tests passed.
- `npm run tsdoc:check`: passed.
- `npm run check`: passed all 10 gates, including lint, coverage, dependency checks, and zero clones.
- `npm run build:cloud`: passed.

## Next step

Continue the lexicographic cloud audit at `src/cloud/submit-new-story/index.js`.

## Retrospective

- Unexpected hurdle: the runtime composes several adapters and a shared Firestore resolver, so checking only the visible write adapter would not establish that initialization receives the capability.
- Diagnosis: traced startup creation through the Firebase app manager and Firestore resolver, then followed the HTTP boundary into the core handler and persistence adapter.
- Chosen fix: no implementation change was needed; current adapters and token forwarding satisfy the spec for this path.
- Next time: verify both the request path and shared startup resolver when auditing a cloud entry point.
