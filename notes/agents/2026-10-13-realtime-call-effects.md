# Realtime call AllowEffects migration

- **Unexpected hurdle:** Express recognizes error middleware only when the registered callback has four parameters. The generic request boundary returns a callback shape Express does not recognize as error middleware.
- **Diagnosis:** Focused endpoint tests showed that wrapping every registered handler with the same boundary would erase Express's four-argument signature. Full `npm run check` then identified one untested allowed-origin branch, an unreachable default argument branch, and the non-core adapter line limit.
- **Fix:** Keep Express error middleware registration in the cloud adapter and mint a fresh capability inside its four-argument callback. Cover allowed and absent CORS origins, remove the redundant default argument, and keep the adapter below the 50-line non-core limit.
- **Evidence:** Focused suites passed (8 suites / 55 tests); `npm run check` passed all 10 gates, including unit coverage, 11 local E2E tests, and zero clones; `npm run build:cloud` and generated `node --check` passed.
- **Next:** Continue the lexicographic source-cloud AllowEffects audit at `src/cloud/recalculate-moderator-reputation/index.js`.
