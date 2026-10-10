# Regeneration result reporting decomposition

- **Unexpected hurdle:** Moving the request into a closure initially captured the AllowEffects capability, which the capability lint correctly rejected.
- **Diagnosis:** Effect permissions must remain explicit parameters across every operation boundary; hiding the permission in a callback closure weakens that reviewable contract.
- **Fix:** `performRegeneration` now creates a request operation that accepts `AllowEffects` explicitly, then passes both the permission and operation to `reportRegenerationResult`. Success messages, error reporting, and fetch argument order remain unchanged.
- **Evidence:** Five focused Jest suites passed (192 tests); `npm run lint`, `npm run tsdoc:check`, and `npm run check` passed. The full check terminal summary reported 10 gates and 0 failures. The targeted `admin-core.js` arity baseline fell from 4 to 3 with no suppressions.
- **Next-time guidance:** Keep capability values direct and explicit at each effect boundary. Continue the remaining arity findings individually; the next target is `sendRegenerateVariantRequest`.
