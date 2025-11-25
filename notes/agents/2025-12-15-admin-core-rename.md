## Admin core rename

- **Unexpected friction:** renaming `src/core/browser/admin-core.js` surfaced every reference across tests, the infra copy script, and docs, so I spent extra cycles updating import paths and double-checking the transpiled `public` outputs instead of just renaming a single file.
- **Diagnosis & actions:** I moved the module, updated the browser shim to re-export from the new path, refreshed every test import and the copy script, and grep-validated that nothing still referenced the old `admin-core.js` path.
- **Lesson:** when renaming shared core modules, start with a search/replace to see every consumer and add a follow-up note early so maintainers understand why the rename exists; the dedicated `notes/agents/…` entry also keeps the history of that decision for future agents.
- **Follow-up idea:** consider wiring a quick `rg` alias or script that tracks module renames so the next agent can update all references in one pass rather than piecemeal.
