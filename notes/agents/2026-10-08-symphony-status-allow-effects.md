# Symphony status persistence AllowEffects

- Unexpected hurdle: the status-store writer is called from bootstrap, refresh, app reconciliation, launch success and failure, and runner-exit handling.
- Diagnosis: tracing `writeStatus` call sites showed that changing the filesystem adapter alone would leave several core entry points able to invoke the injected writer without a capability.
- Chosen fix: require a permission on `writeStatus`, bind a fresh permission at each core persistence operation, and forward it through both `mkdir` and both `writeFile` adapters. The local adapter removes the permission only at Node's native filesystem calls.
- Evidence: focused Symphony bootstrap, status-store, app, and launch suites passed; `npm run tsdoc:check` passed; targeted ESLint passed.
- Next-time guidance: trace every consumer of an injected effect callback before changing its signature; preserve per-operation boundaries for async lifecycle callbacks such as runner exit.
