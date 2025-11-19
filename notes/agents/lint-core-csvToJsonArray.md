Refined the CSV-to-JSON helper to satisfy the new linting expectations.

- Noticed the file already carried doc comments, but many were orphaned because they sat before helper comments instead of the functions they described; ESLint was reporting long chains of missing `@param`/`@returns` warnings. Reordered the blocks so each doc comment sits immediately before its function, which required introducing a tiny `getTrimmedLines` helper to keep `normalizeInputLines` under the complexity and no-ternary limits.
- Simplified complexity hotspots (`parseHeaderEntries`, `getRowsFromHeaderInfo`, `buildRows`, `assignRecordValue`) by splitting logic into helpers, avoiding inlined ternaries, and ensuring each function has no more than a single guard clause. Mapping data lines first allowed `buildRows` to retain a single branching statement while still validating records before pushing.
- Running `npm run lint` and `npm test` before and after the refactor confirmed the changes eliminated roughly 11% of the `src/core` warnings without affecting functionality or coverage.

Open questions / follow-ups:
1. Should other core functions adopt the “map then validate” pattern to stay within the complexity ceiling, or is that too eager?
2. Could a lint rule be added or tuned so that doc comments are automatically enforced to sit directly before the documented function?
