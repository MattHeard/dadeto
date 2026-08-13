# Codex VM logging writer

- **Loop contract:** Grant only `roles/logging.logWriter` to the production Codex VM service account through Terraform.
- **Diagnosis path:** `infra/codex-vm.tf` creates `google_service_account.codex_vm`; the existing policy test encoded the former no-project-roles invariant.
- **Chosen fix:** Add a gated `google_project_iam_member` binding and narrow the test to the requested logging role.
- **Next-time guidance:** Verify the production Terraform apply and the live IAM binding after the change is pushed.
