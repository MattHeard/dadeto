# Cloud render support coverage

- Hurdle: existing tests covered fetch, memoization, runtime, and context basics but not the shared dependency bag or full entrypoint state.
- Diagnosis: the uncovered code is deterministic wiring that can be tested without loading any HTML renderer modules.
- Fix: add direct dependency-builder, renderer-builder, and memoized-entrypoint-state assertions.
- Guidance: isolate shared render infrastructure from template-renderer imports when running CommonJS Jest coverage.
