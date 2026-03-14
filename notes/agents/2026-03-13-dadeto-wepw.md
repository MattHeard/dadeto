# Reshape ledger-ingest into a runnable toy

- **Unexpected hurdle:** None; the core and fixture suite were already stable, so the loop focused on relocating code and wiring up the new toy surface without touching business logic.
- **Diagnosis path:** The bead described the need to surface ledger-ingest via a toy; I inspected `test/toys/2026-03-10/ledger-ingest.test.js` plus the surrounding docs to understand which imports/docs mention the core path and the expected commands.
- **Chosen fix:** Moved `core.js` into `src/core/browser/toys/2026-03-13/ledger-ingest/`, added `ledgerIngestToy.js` for a thin presenter, updated docs/tests/notes to point at the new location, and reran `npm test` (which exercises `test/toys/2026-03-10/ledger-ingest.test.js`) as the minimal validation step.
- **Next time:** Keep doc references in sync with any future toy reshapes by updating both the spec/harness notes and the agent memory entries before touching user-facing code.
