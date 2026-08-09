# Stripe billing changeset 4

- Unexpected hurdle: static billing UI wiring has no existing checkout page or deployed package-offer function, so the changeset needed both a public-offer cloud function and static assets.
- Diagnosis: the existing auth module already refreshes Firebase tokens through the current user, and static configuration is the established endpoint boundary.
- Chosen fix: added pure billing offer/purchase cores, public package endpoint, static `/billing/` page, idempotent attempt UUID flow, retry-safe controller, and Terraform/build wiring.
- Next-time guidance: add the authenticated purchase-status endpoint and read-only settlement observer in changeset 5; revisit the current lint warning cleanup before the final aggregate gate.
