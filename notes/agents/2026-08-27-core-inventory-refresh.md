# Core inventory refresh

- Unexpected hurdle: the prior inventory was stale, naming one deleted file and omitting 25 files added after its 2026-08-21 snapshot.
- Diagnosis: current `find src/core -type f` evidence reports 375 files, while the old header reported 350.
- Fix: refreshed the durable inventory to 375 current files, removed the deleted path, and recorded the static `src/core/browser/toys/AGENTS.md` boundary.
- Evidence: sorted inventory comparison has no stale paths; current filesystem count is 375. Authoritative ledger state is 310 evidenced files and 65 remaining after this static entry.
