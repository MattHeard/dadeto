# gcp-test destroy-order fix

- Unexpected hurdle: the Playwright browser step was green, but the overall `gcp-test` workflow still failed in `Terraform Destroy`.
- Diagnosis path: the destroy log showed the Playwright proxy subnet failing with `compute.subnetworks.delete` forbidden after the Compute API resource had already been torn down. That pointed to Terraform destroying the shared `google_project_service.compute` resource too early for the Playwright network resources.
- Chosen fix: add `google_project_service.compute` to the `depends_on` list for `google_compute_subnetwork.playwright_proxy_only` in `infra/playwright.tf` so the Compute API stays available until the subnet is deleted.
- Next-time guidance: when a teardown failure mentions a Compute API permission on a network resource, check whether the API service itself is being destroyed before the network objects finish cleaning up.
