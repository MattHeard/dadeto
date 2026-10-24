# THREEFOLD Notion spec synchronization

- **Unexpected hurdle:** The original Full Check workflow made every unrelated validation run depend on a dedicated Notion token that this workspace intentionally does not have.
- **Diagnosis:** The spec now declares Notion authoritative and the repository copy a best-effort cache. Live drift detection is optional; CI must remain offline from Notion while still rejecting a malformed checked-in cache.
- **Chosen fix:** Add a deterministic local cache validator, run it from Full Check without credentials, and retain strict manual refresh/live-check commands. Add a separate silent best-effort refresh for implementation start and completed-subtask boundaries. Document requirement reconciliation and prove missing-token/network failures leave the cache untouched.
- **Verification:** Focused sync and workflow tests, `npm run threefold:spec:cache:check` with no Notion token, focused ESLint, `npm run check`, `npm run build`, `npm run manuals:check`, and exact-head Full Check.
- **Next-time guidance:** Refresh the live source at implementation start and completed-subtask boundaries, not on every read. If the cache changes, reconcile the unfinished work before the next subtask. Treat live failures as silent no-ops and never put Notion credentials in CI.
