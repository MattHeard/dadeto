# Regenerate request transport decomposition

- **Unexpected hurdle:** The fetch helper's options combined endpoint resolution, auth payload creation, transport, and response checking, making a direct capability-aware signature exceed the arity limit.
- **Diagnosis:** Only `RequestInit` is a necessary cohesive object at the transport boundary. Endpoint lookup and request construction belong to the command operation that already has the endpoint and authenticated payload.
- **Fix:** Moved endpoint lookup and POST option construction into the request operation. `sendRegenerateVariantRequest` now takes the explicit `AllowEffects`, `FetchFn`, resolved URL, and standard request options, and continues to validate non-success responses.
- **Evidence:** Five focused Jest suites passed (192 tests); `npm run lint`, `npm run tsdoc:check`, and `npm run check` passed. The full check reported 10 gates and 0 failures. Targeted `admin-core.js` arity findings fell from 3 to 2 without suppressions.
- **Next-time guidance:** Keep only API-defined cohesive objects such as `RequestInit`; pass unrelated dependencies as separate operations or values. Next inspect the live arity findings before choosing between `initAdmin` and `initAdminApp`.
