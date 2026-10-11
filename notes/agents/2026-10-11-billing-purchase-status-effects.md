# Billing purchase status response effects

- **Unexpected hurdle:** The endpoint already had a pure purchase-status core, but its public cloud handler still wrote directly to the Express response on both success and method rejection.
- **Diagnosis:** Read-only token verification, purchase lookup, and balance lookup return data; the externally visible response operations are the command effects.
- **Fix:** Added a cloud HTTP composition helper that uses `createEffectHttpBoundary` to mint a fresh permission per request, plus one permission-first adapter for JSON and text response writes. The pure `createPurchaseStatusHandler` and its read/query behavior remain unchanged.
- **Validation:** Focused purchase-status core and cloud tests passed (3 suites, 8 tests); targeted ESLint, TSDoc, and `git diff --check` passed. `npm run check` passed all 10 gates with 0 clones and 0 audit vulnerabilities (`.tmp/npm-check-billing-purchase-status-effects.log`); `npm run build` passed (`.tmp/build-billing-purchase-status-effects.log`).
- **Next-time guidance:** For external HTTP endpoints, keep the public request/response signature unchanged and mint `AllowEffects` inside the boundary wrapper. Keep response formatting and writes in the cloud adapter, leaving the core status result as plain data.
