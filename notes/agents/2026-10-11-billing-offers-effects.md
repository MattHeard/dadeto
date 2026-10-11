# Public billing offers response effects

- **Unexpected hurdle:** The public offers endpoint kept its method check and response write inline even though its offers computation already returned a pure status/body value.
- **Diagnosis:** Package/pricing reads and the billing-enabled decision are data/query behavior; Express response writes are externally visible commands.
- **Fix:** Added a public HTTP wrapper that creates a fresh `AllowEffects` token per request and a permission-first response adapter for JSON and text results. The existing offers handler and feature-flag behavior remain unchanged.
- **Validation:** Focused core and cloud tests passed (3 suites, 7 tests); targeted ESLint, TSDoc, and diff checks passed. `npm run check` passed 10/10 gates with 0 clones and 0 audit vulnerabilities (`.tmp/npm-check-billing-offers-effects.log`); `npm run build` passed (`.tmp/build-billing-offers-effects.log`).
- **Next-time guidance:** Keep public Cloud Function request signatures stable; create the effect permission only inside the HTTP boundary and pass it to response adapters explicitly.
