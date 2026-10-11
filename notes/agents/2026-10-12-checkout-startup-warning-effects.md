# Checkout startup warning effect boundary

- **Unexpected hurdle:** Adding the Stripe configuration warning adapter to the existing checkout adapter module exceeded the repository's 50-line non-core file limit.
- **Diagnosis:** Startup logging is a distinct effect from response and Firestore adapters, so combining them made the cloud module too large.
- **Fix:** Moved the warning into `startup-effect-adapters.js` and invoke it through `createEffectInvocationBoundary`. The adapter requires `AllowEffects`, preserves the warning text, and only logs when Stripe is unavailable.
- **Validation:** Focused checkout suites passed (4 suites, 31 tests); targeted ESLint, TSDoc, `non-core-thin`, and `git diff --check` passed. `npm run check` passed all 10 gates with 0 clones and 0 audit vulnerabilities (`.tmp/npm-check-checkout-startup-warning-effects-final.log`); `npm run build` passed (`.tmp/build-checkout-startup-warning-effects.log`).
- **Next-time guidance:** Keep startup effects in a small, purpose-named adapter when an existing adapter module is near the non-core size limit; retain per-invocation permission creation at the boundary.
