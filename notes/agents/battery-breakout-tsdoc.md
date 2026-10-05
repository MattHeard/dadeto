# Battery Breakout JSDoc typing

- Unexpected hurdle: the file already had useful game-state typedefs, but most helper contracts were still `unknown`; removing the pragma surfaced 282 diagnostics initially.
- Diagnosis path: grouped errors around storage/input boundaries, persisted state normalization, and mutable simulation helpers, then typed those seams and reran the project checker.
- Chosen fix: added typed storage, seed, input, cell-position, and action-result contracts; narrowed persisted records; documented simulation-state APIs; and carried the existing seed value into constructed state.
- Evidence: `npm run tsdoc:check -- --pretty false`, focused ESLint, and `git diff --check` pass.
- Next-time guidance: reuse the already-defined game-state types when typing similar toys, and check each constructor against the fields that normalization and reset logic persist.
