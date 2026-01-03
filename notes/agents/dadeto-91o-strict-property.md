## Strict Property Initialization

- **Surprise:** After flipping `strictPropertyInitialization` on, there were no new TS2564-style errors inside the JS helpers—tsdoc still failed only on the presenter/toy suites I expected, so enabling the flag was purely a configuration exercise rather than a refactor.
- **What I did:** Added the flag to `tsconfig.jsdoc.json`, reran `npm run tsdoc:check`, and saved the full output to both `tsdoc-check-current.log` and `tsdoc-check-output.txt` so the next beads can point directly at the remaining failures (e.g., `battleshipSolitaireClues`, `ticTacToeBoard`, and `toys/2025-04-06/ticTacToe`).
- **Next:** Continue down the priority list (likely the cloud/presenter beads) now that strict nulls, function types, and property initialization are all enabled. Keep the new log file handy so the future work can cite the exact error list without rerunning tsdoc immediately.
