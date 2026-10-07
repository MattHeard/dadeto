# Billing feature flag

The billing endpoints had no shared off switch. Added Terraform `billing_enabled`, defaulting to false and injected into cloud function environments as `BILLING_ENABLED`. Production reads the GitHub Actions repository variable `PROD_BILLING_ENABLED`, with an unset variable remaining false. The off state hides offers, rejects checkout before auth/provider work, and rejects new charge/reservation writes. Webhooks, refunds, status reads, resolution of existing reservations, and reconciliation stay enabled for in-flight activity.

Validation: `npm run check` passed all ten checks and aggregate coverage was 100% for lines, statements, functions, and branches. `npm run build:cloud` and `terraform -chdir=infra fmt -check` passed. Local `terraform validate` is blocked by the machine's Terraform wrapper, which directs resource configuration validation through the GitHub workflows.

To change production behavior, set or remove `PROD_BILLING_ENABLED` in GitHub Actions repository variables and run `gcp-prod`. Keep it false until reviewed pricing/catalog data and the billing launch gate are ready. A future operation-charge caller must pass the configured flag into `createBillingRuntime`.
