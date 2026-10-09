# Billing purchase status effects audit

- Unexpected hurdle: the next source-cloud entrypoint appeared to combine Firebase and Firestore calls with an HTTP response, making it unclear whether it carried a command effect into core.
- Diagnosis: `createPurchaseStatusHandler` only verifies a token and reads purchase/balance data. `findBillingPurchaseByCheckout` uses a Firestore query and `.get()`; the endpoint's `res.status().send()` and `.json()` calls stay in the cloud entrypoint and are not injected into core.
- Chosen fix: no AllowEffects change. The audited injected dependencies are read-only, so adding a command capability here would not mark an actual command effect.
- Next-time guidance: continue the lexicographic `src/cloud` audit and follow injected call trees to the concrete SDK operations before classifying them.
