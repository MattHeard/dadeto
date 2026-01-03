## No Implicit This

- **Surprise / Observation:** Enabling `noImplicitThis` didn’t layer on new tsdoc errors beyond the existing presenter/toy complaints; the log still highlights `battleshipSolitaireClues`, `ticTacToeBoard`, and the 2025 toy suite, meaning the flag mostly catches the same places that already have weak `this`/callback handling.
- **Actions:** Added the flag inside `tsconfig.jsdoc.json`, reran `npm run tsdoc:check`, and dumped the log to `tsdoc-check-current.log`/`tsdoc-check-output.txt` so the next beads have a fresh baseline. Logged the status on `dadeto-bqi` so downstream work knows the flag is enabled and the outstanding blockers are the same as before.
- **Next:** Continue with whichever bead the backlog orders (likely the presenter or toy typing issues) now that tsdoc enforces strict nulls, function types, property initialization, and `noImplicitThis`. Use the saved log when listing failing files in future updates.
