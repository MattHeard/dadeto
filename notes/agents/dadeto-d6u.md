# dadeto-d6u

- Added precise DOM helper handling in `src/core/browser/tags.js`: the hide-span builder now exits early when a link has no parent, and the article loop converts the collection to `HTMLElement[]` so `hideArticleWhen` receives a concrete `HTMLElement` (the new type guards keep tsdoc from complaining about `ParentNode | null` and `Element`).
- `npm run tsdoc:check` still reports legacy issues in presenters/toys (e.g., `src/core/browser/presenters/battleshipSolitaireClues.js`, `ticTacToeBoard.js`, `italics.js`, `fishingGame.js`), but the errors that targeted this bead are gone—tags.js no longer appears in the log.
- Open question: once the strict-null flags land, should we address the presenter/toy tsdoc noise (especially the battleship/tic-tac-toe helpers) before enabling additional tsdoc checks?
