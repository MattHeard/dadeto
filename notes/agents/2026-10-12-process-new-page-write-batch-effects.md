# Process new page batch write effects

- Unexpected hurdle: shared-core submission handling still issued Firestore batch writes directly, and a repository-wide check initially appeared to stall while waiting for a Jest slot owned by a PID from another process namespace.
- Diagnosis: the trigger capability already reached skipped-submission updates, but normal submissions still called `WriteBatch.set`, `update`, and `commit`; Jest's machine-wide lock looked live in this container even though the owner process was absent here.
- Chosen fix: create a narrow batch facade through a permission-first factory for each trigger invocation. Keep raw batch commands in cloud and simulator adapters, pass the trigger capability when core requests the facade, and add a regression for that exact token forwarding. Use the repo-local Jest pool in isolated environments.
- Next-time guidance: scan all batch commands when auditing Firestore effects, and inspect lock owner namespace before waiting on an apparently live shared Jest slot. Next source-cloud audit target remains `src/cloud/hide-variant-html/` after the previously recorded endpoints.
