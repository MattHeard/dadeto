# Floating credit pricing — 2026-08-05

- Unexpected hurdle: the repository has a fixed integer credit ledger and checkout core, but no Stripe runtime adapter, package catalog, or operation-cost resolver to wire into.
- Diagnosis: repository search found `credit_amount` is currently supplied through Stripe metadata and the Firestore ledger only stores one aggregate balance plus fixed-amount events.
- Chosen fix: added deterministic daily-snapshot pricing primitives, FIFO lot consumption/refund primitives, and dynamic Checkout `price_data` support while preserving the legacy Stripe Price path.
- Next-time guidance: finish the Firestore purchase-lot migration and deploy a real package/operation catalog before enabling dynamic checkout in production; run quality gates under the project’s Node 20+ engine because the current Node 18 sandbox blocks child processes and newer dependency APIs.
