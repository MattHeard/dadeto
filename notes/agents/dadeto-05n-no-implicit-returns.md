## noImplicitReturns

- **Observation:** Adding `noImplicitReturns` didn’t change the reported tsdoc failures; the log still lists the presenter/toy helpers such as `battleshipSolitaireClues`, `ticTacToeBoard`, and `toys/2025-04-06/ticTacToe`, so the stricter flag only reconfirms the existing weak typings.
- **Work:** Flag enabled in `tsconfig.jsdoc.json`, reran `npm run tsdoc:check`, and saved the log to `tsdoc-check-current.log`/`tsdoc-check-output.txt` for reference. Logged the bead so the next phase knows this flag is active and the same modules are still failing.
- **Next:** Proceed through the remaining strict flags or tackle the highlighted presenter/toy files while referencing the saved log.
