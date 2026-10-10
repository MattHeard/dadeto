# Payment webhook status effect boundary

- Unexpected hurdle: the first direct Jest invocation omitted the repository's ESM runner setup, and the sandboxed full check blocked child Node processes with `EPERM`.
- Diagnosis: webhook and simulator behavior passed under `scripts/run-jest.js`; the full evaluator requires elevated subprocess/network access for coverage discovery, core parsing, and npm audit.
- Chosen fix: injected payment-event status persistence now takes `AllowEffects`, the cloud boundary mints it per request, and the local simulator does the same while persisting status transitions.
- Evidence: focused suites passed (5 suites, 35 tests); `npm run check` passed (10/10 gates, 0 clones, 11/11 local E2E); `npm run build:cloud` passed.
- Next-time guidance: use the repo's ESM-aware Jest runner for focused tests; request an elevated run for the full evaluator when child-process or registry access is denied by the sandbox.
