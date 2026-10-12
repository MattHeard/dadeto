# Mark variant dirty effect audit

- Unexpected hurdle: the source-cloud audit spans startup composition and later request handling, so the two capability lifetimes needed checking independently.
- Diagnosis: inspected `src/cloud/mark-variant-dirty/index.js`, `src/core/cloud/mark-variant-dirty/run.js`, the core mutation helpers, and every cloud adapter. Startup initialization, middleware registration, and route registration use startup boundaries. Variant/author updates, HTTP responses, and warning logs use request capabilities through permission-first adapters. Firestore `.get()` calls and auth token verification remain reads/lookups. The returned Express handler does not retain a startup token.
- Chosen fix: no code change; all command-style operations in this endpoint already cross explicit effect adapters.
- Next-time guidance: keep request handlers capability-fresh when inspecting composition roots. Continue the lexicographic audit at `src/cloud/object-minute-rental-search/`.
- Evidence: focused Jest passed (7 suites / 77 tests); `npx tsc --project tsconfig.jsdoc.json --noEmit --pretty false` passed.
