## Mark variant dirty verify admin refactor

- The inline `verifyAdmin` logic mixed Firebase calls and response handling, so I extracted it into a dependency-injected factory that mirrors the old flow while allowing collaborators for token verification and admin checks to be swapped in tests.
- Copying the new core module into each Cloud Function package initially risked shipping the lightweight re-export, so I extended the copy pipeline to overwrite the shim with the full implementation to keep deployments self-contained.
