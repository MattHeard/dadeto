## strictBindCallApply

- **Observation:** Turning on `strictBindCallApply` didn’t surface any new files beyond the existing presenter/toy failure list; the tsdoc log still lists `battleshipSolitaireClues`, `ticTacToeBoard`, and `toys/2025-04-06/ticTacToe`, confirming the flag mostly just verifies the same weak typing that the other strict options already highlighted.
- **Work:** Added the flag to `tsconfig.jsdoc.json`, reran `npm run tsdoc:check`, and preserved the output in `tsdoc-check-current.log` and `tsdoc-check-output.txt`. Logged the status in `dadeto-y45` so the next bead in the queue knows the strictness surface is now at this level.
- **Next:** Continue with the remaining strict flags or follow the existing tsdoc error log when fixing the presenter/toy helpers now that strict nulls, function types, property initialization, `noImplicitThis`, and `strictBindCallApply` are in place.
