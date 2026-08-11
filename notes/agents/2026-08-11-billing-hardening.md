# Billing hardening implementation

- Unexpected hurdle: the repository-wide test wrapper cannot spawn its child Node process in this sandbox (`spawnSync ... EPERM`).
- Diagnosis: direct `npx jest --runInBand --watchman=false` works and validates the billing suites; the failure occurs in the coverage test-file discovery wrapper.
- Fix: added protocol, ledger, reservation/recovery, reconciliation runtime support, focused tests, and this operational runbook without bypassing webhook verification.
- Next-time guidance: rerun `npm run check` in a normal CI/runtime environment, then complete Stripe test-mode integration and independent adversarial review before enabling passive billing.
