## noFallthroughCasesInSwitch

- **Observation:** Enabling `noFallthroughCasesInSwitch` didn’t broaden the tsdoc failure list; we still see the same presenter/toy helpers flagged (notably `battleshipSolitaireClues`, `ticTacToeBoard`, and `toys/2025-04-06/ticTacToe`), so the existing errors already cover the new flag’s reach.
- **What I did:** Added the flag to `tsconfig.jsdoc.json`, reran `npm run tsdoc:check`, and saved the new log to `tsdoc-check-current.log`/`tsdoc-check-output.txt`. Logged the bead so future work knows this strictness level is enforced.
- **Next:** Continue sequencing through the beads (presenters/toys) with the updated log as the baseline until tsdoc passes, now that all strict flags are live.
