# Shared allowed-origin diagnostics require explicit effects

- Unexpected hurdle: the full `npm run check` coverage phase still aborts at the configured 512 MB worker heap, including with `DADETO_COVERAGE_SHARD_SIZE=1`.
- Diagnosis: `resolveAllowedOrigins` was the shared direct `console.debug` call. Its core callers were generate-stats, errors, get-moderation-variant, mark-variant-dirty, and assign-moderation-job. Other same-named resolvers in CORS configuration are pure and separate.
- Chosen fix: require `AllowEffects` and an injected `logDebug` adapter at the shared resolver boundary; pass the capability only inside startup/request composition and route the runtime write through the cloud adapter.
- Evidence: seven focused Jest suites pass (176 tests); JSDoc typecheck, `npm run build`, `npm run build:cloud`, `npm run non-core-thin`, and `npm run check -- --skip-tests` pass. Full `npm run check` remains open on the coverage worker OOM.
- Next time: check the imported helper's actual module before migrating a same-named resolver, and track the worker OOM in `dadeto-zflf` before closing this bead.
