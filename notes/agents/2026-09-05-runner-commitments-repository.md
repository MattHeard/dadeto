# Runner commitments repository seam

- Unexpected hurdle: the search HTTP tests and local simulator still injected a Firestore-shaped `db` directly.
- Diagnosis: the shared search adapter was responsible for storage traversal and silently skipped missing commitment records.
- Fix: introduced a storage-agnostic application capability, a fail-closed shared projection, a browser adapter, and a Firestore adapter; cloud and local composition now select the appropriate adapter.
- Verification: focused search and repository Jest tests pass; `npm run check:fast` remains blocked by sandbox `spawnSync node EPERM`, and local Playwright could not be run because the environment rejected its escalation request.
