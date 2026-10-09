# Billing read endpoint AllowEffects audit

- Unexpected hurdle: the shared `createBillingRuntime(db)` name makes read-only endpoints appear to use a write-capable core API.
- Diagnosis: `src/cloud/billing-purchase-status/index.js` passes `getPurchaseByCheckoutSession` and `getBalance` into the status handler; both perform Firestore `.get()` queries. `src/cloud/billing/index.js` passes active-package and pricing reads into the public-offers handler. The handlers only compute response values. Both HTTP wrappers call `res.status().send/json` directly at the cloud boundary, outside `src/core`.
- Chosen fix: no permission migration was appropriate for this slice: the injected callbacks are queries, while response writes already execute in the external cloud entrypoints. Record this classification so the audit does not add tokens to reads or move response ownership unnecessarily.
- Next-time guidance: inspect the specific runtime methods passed to core, not every method exposed by a shared runtime factory. Continue the lexicographic cloud audit with the next entrypoint and separately inspect any billing write path under the billing hardening specification.
