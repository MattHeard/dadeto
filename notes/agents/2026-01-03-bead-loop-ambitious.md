Bead loop 2026-01-03 (ambitious)
--------------------------------
- Knuckled through an aggressive round of 12 beads (seven tic-tac-toe helpers plus five presenter docs) so every extra `@returns`/`@param` description in `src/core/browser/toys/2025-04-06/ticTacToe.js` and `findValidationError` now explicitly explains why the boolean/string value matters for validation or minimax flow.
- The finished loop documented the `BattleshipClueCandidate` param type, the error-message return value, and the board/state helpers that seed move generation, and I reran `npm run lint` twice to prove only the remaining warnings from the fleet/toy/cloud modules are still open.
- Follow-up idea: keep expanding the tsdoc fixes outward (battleshipSolitaireFleet, startLocalDendriteStory, csvToJsonArray, moderatorRatingCounts, browserToysCore, toys-core, assign-moderation-job-core, render-variant-core, submit-new-page-core, commonCore) so the multi-bead chores can complete while the lint log shrinks.
