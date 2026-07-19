# GCP diagram generator

- Unexpected hurdle: this worktree did not have the installed ESLint dependency set, so targeted lint could not start.
- Diagnosis: Terraform function names use underscores while `src/cloud/` directories use hyphens; direct name matching initially dropped all source-derived edges.
- Fix: normalize Terraform names to hyphenated source directory names and scan matching `src/core/cloud/` implementations recursively.
- Next-time guidance: regenerate with `npm run generate:gcp-diagram` after adding or renaming a deployed function, then inspect inferred edges for dynamic references.
