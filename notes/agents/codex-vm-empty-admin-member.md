# Codex VM empty administrator member

- **Unexpected hurdle:** GitHub Actions supplies an unset repository secret as an empty string, while the production workflow unconditionally enabled the Codex VM.
- **Diagnosis path:** The Terraform error pointed to the project IAM member. Tracing `codex_admin_member` showed that the variable deliberately permits an empty default for non-VM environments, but the production workflow still set `codex_vm_enabled` to `true`.
- **Chosen fix:** Derive the workflow's VM-enabled flag from the presence of `CODEX_ADMIN_MEMBER`, and include the non-empty member in Terraform's shared enablement condition so every VM and IAM resource uses the same guard.
- **Next-time guidance:** Optional infrastructure that requires a secret should use the secret's presence to gate the whole resource group; do not rely on a resource precondition that Terraform may evaluate after provider argument validation.
