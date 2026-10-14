# Submit new story AllowEffects audit

## Findings

The `submit-new-story` cloud path keeps startup and request capabilities separate. Firebase initialization, startup diagnostics, middleware/route registration, and HTTPS endpoint registration receive startup AllowEffects. Each HTTP invocation receives a fresh capability; the core request path forwards it to persistence and response adapters. Request debug logging and CORS error response/forwarding are also behind adapters that receive fresh capabilities. Firestore reads and auth verification remain query operations; UUID and server-timestamp construction remain construction operations. No unguarded command effect or captured startup token was found.

## Evidence

- Focused tests: 6 suites, 64 tests passed.
- `npm run tsdoc:check`: passed.
- `npm run check`: passed all 10 gates, including lint, coverage, dependency checks, and zero clones.
- `npm run build:cloud`: passed.

## Next step

Continue the lexicographic cloud audit at `src/cloud/update-variant-visibility/index.js`.

## Retrospective

- Unexpected hurdle: debug logging and CORS error forwarding run on distinct request paths in addition to the normal HTTP responder.
- Diagnosis: traced startup diagnostics, the wrapped responder, the CORS error boundary, and the common HTTP endpoint composer.
- Chosen fix: no implementation change was needed; startup and request effects already have explicit permission adapters and fresh request capabilities.
- Next time: check debug and error paths alongside the normal request path for each cloud endpoint.
