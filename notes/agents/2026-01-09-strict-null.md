Strict null checks

- Enabled `strictNullChecks` in `tsconfig.jsdoc.json`, which immediately surfaced new tsdoc failures across data/storage helpers, presenter types, and the toy/cloud suite.
- Captured the fresh log in `tsdoc-check-output.txt` and created `dadeto-oul` to track the new data/localStorage/storageLens type errors plus `dadeto-98t` for the lingering battleship presenter doc warnings that lint still emits.
- Ran `npm run test`, `npm run lint`, and `npm run tsdoc:check` so the quality gate is up to date before leaving the bead; the tsdoc run now fails heavily because of the newly exposed strict-null cases.

Next steps: address each remaining group of tsdoc errors (data/storage, presenters, toys, cloud helpers) via their respective beads, ensuring strict-null compliance before marking `dadeto-007` as closed.
