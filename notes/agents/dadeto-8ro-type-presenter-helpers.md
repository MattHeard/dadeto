## dadeto-8ro: Tsdoc: type presenter helpers

- **Unexpected:** `tsdoc:check` still treated `BattleshipClueCandidate` as optional inside the validation helpers, so I had to add a small runtime guard/cast before wiring the validation pipeline instead of just trusting the `VALIDATION_CHECKS` array to prove each predicate’s input type.
- **Work:** Added `ensureArray` plus an `unknown`-aware `findValidationError` so `getClueArrays` now always returns arrays the compiler can understand, narrowed the `clue` validations, and rewrote the Tic-Tac-Toe helpers with safer positional guards and a legal-move type predicate so the board updater only receives fully validated moves.
- **Tests:** `npm run lint`, `npm run tsdoc:check` (still fails for the outstanding toy helpers in `src/core/browser/toys/*`).
