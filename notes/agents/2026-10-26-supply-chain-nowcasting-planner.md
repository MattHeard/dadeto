# Supply-chain nowcasting planner loop

- Unexpected hurdle: adding a toy directory alone breaks the repository's manual catalogue gate; the manual must also be registered exactly once in `src/build/blog.json`.
- Diagnosis: the first aggregate check failed in `manuals:check`, `lint`, and `tsdoc:check`. After repairing those, `check:impact:run` surfaced a single uncovered array-validation branch.
- Chosen fix: add the separate field guide and manifest entry, give the pure model explicit JSDoc types, and test malformed candidate collections as explicit errors. The planner core now has complete changed-file branch coverage.
- Next-time guidance: for any new `docs/toys/<name>/`, copy the four template docs first, add a schema-backed `manual.md`, register one manifest manual, and run `npm run manuals:check` before the full check. Include `npm run check:impact:run -- --files <core-source> <tests>` for new core behavior.
- Open work: implement the browser-facing sample/disruption flow, full assumptions and results export/import, optional identifiers, browser tests, and scoped Stryker review for the remaining Rank 10 acceptance criteria.
