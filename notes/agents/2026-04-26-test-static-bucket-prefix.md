# Test Static Bucket Prefix

- Unexpected hurdle: the test workflow did not set `enable_lb=false`, so relying on the variable default would still let `t-*` plans create global LB resources.
- Diagnosis path: traced `infra/main.tf`, `infra/load-balancer.tf`, `infra/playwright.tf`, and `.github/workflows/gcp-test.yml` together instead of assuming workflow variables supplied the guard.
- Chosen fix: make `local.enable_lb` false whenever `local.playwright_enabled` is true, use a shared test static bucket for `t-*`, keep per-environment object prefixes, and clean the prefix after Terraform destroy in the GCP test workflow.
- Next-time guidance: when moving ephemeral state onto shared infrastructure, check both Terraform defaults and CI-provided `TF_VAR_*` values; the safe behavior should live in Terraform, not only in workflow configuration.
