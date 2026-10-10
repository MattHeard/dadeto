# Key row migration arity

- **Unexpected hurdle:** The key migration helper mixed row-map updates with a DOM attribute write, which made the internal operation carry five dependencies.
- **Diagnosis path:** The current parameter-bag lint identified `migrateRowIfValid`; existing key-input tests already covered empty, duplicate, and successful rename behavior, while migration coverage also included `rowTypes` fallback behavior.
- **Chosen fix:** The helper now receives only the previous key, next key, and row data, and returns whether it migrated. The event handler updates `prevKey` only after a successful migration. Tests now verify row type preservation and that invalid renames leave row types unchanged.
- **Evidence:** Targeted Jest passed (2 suites, 22 tests); the targeted no-cache arity scan dropped `src/core/browser/toys.js` from 15 findings to 14. `npm run lint`, `npm run tsdoc:check`, and the full `npm run check` passed; local E2E passed 11/11, all 10 non-test gates passed, duplication found 0 clones, and audit found 0 vulnerabilities. Full check log: `.tmp/npm-check-migrate-row.log`.
- **Next-time guidance:** Keep DOM synchronization in the event handler, and let the row-map operation report success so the side effect remains conditional without passing DOM dependencies into the data transformation.
- **Next loop:** Continue with the next `toys.js` parameter-bag finding; retain the same no-suppression diagnostic and one-function scope.
