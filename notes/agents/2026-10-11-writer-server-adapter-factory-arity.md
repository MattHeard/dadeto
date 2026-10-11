# Writer server adapter factory arity cleanup

- Unexpected hurdle: the first full check exposed a test helper that unpacked the server options object, triggering both parameter-bag arity and JSDoc warnings.
- Diagnosis: server creation depends on stable HTTP, HTTPS, and file-reading adapters, while each server instance supplies only its app and environment. The options object mixed those lifetimes.
- Fix: changed the core entry point into a factory that captures the cohesive server adapters and returns a two-input app/environment constructor. The local boundary retains its existing options interface and supplies defaults. Tests now pass the adapters and per-server values as distinct inputs.
- Next time: keep server factory wiring in the external boundary and exercise HTTP and HTTPS selection with injected adapters. Next global finding: `src/core/object-minute-rental-search/commitment-records/index.js:44` (effective arity 5).
