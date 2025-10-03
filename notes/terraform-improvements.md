# Terraform Refactoring & Maintenance Ideas

These notes capture potential improvements to streamline the infrastructure codebase.

- [ ] **Modularize static site and CDN resources** – Extract the storage bucket, static files, and CDN/load balancer setup into a reusable module (for example, `static_site`) so the root configuration stays lean while encapsulating the static hosting logic.
- [ ] **Modularize Cloud Functions deployment** – Consolidate the nearly identical Cloud Function resource blocks into a module or a `for_each` loop parameterized by function name, entry point, source path, and shared settings to eliminate duplication.
- [ ] **Modularize Identity Platform/Firebase setup** – Move Firebase service enablement and Identity Platform configuration into an `auth` module to isolate authentication concerns from the rest of the infrastructure.
- [ ] **Modularize Firestore configuration** – Create a dedicated module for Firestore database creation, security rules, and indexes so database changes can be managed independently.
- [ ] **Isolate global vs. environment-specific resources** – Split project-level resources (API enablement, project IAM, etc.) from per-environment stacks to remove conditional guards and keep non-production runs focused on their own infrastructure.
- [ ] **Improve file and directory structure** – Restructure the Terraform tree into clear `env/` and `modules/` directories with per-environment tfvars files, avoiding automatic loading of production settings.
- [ ] **Standardize naming conventions** – Apply consistent naming that always includes the environment (including production) and uses descriptive resource names to reduce ambiguity.
- [ ] **Use variables/locals for common values** – Centralize repeated literals (such as the Terraform service account email and shared Cloud Function environment variables) into locals or variables to minimize repetition and typo risk.
- [ ] **Apply DRY principle with loops** – Replace repetitive resource blocks (e.g., many `google_storage_bucket_object` definitions) with `for_each`/`count` constructs iterating over shared maps of configuration values.
- [ ] **Enhance remote state management** – Separate remote state backends or keys per environment and document or automate state bucket creation to prevent cross-environment collisions.
- [ ] **Remove unused or deprecated resources** – Prune legacy buckets, outdated functions, and stale `moved` blocks to simplify the configuration and reduce maintenance overhead.

