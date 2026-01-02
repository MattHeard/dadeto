# dadeto-98t

- Documented the battleshipSolitaireClues helpers so the optional clue typedefs now explain the source of each array and the validated config makes it explicit that rows/columns are numeric (`src/core/browser/presenters/battleshipSolitaireClues.js:25-36`).
- Expanded the inline JSON parser helper into a full JSDoc block so the `json` parameter and return type are described, keeping `tsdoc:check`/ESLint happy with the earlier complaint about missing param/return docs.
- `npm run lint` still reports the long-standing complexity/ternary warnings in the storage helpers; they predate this work and remain open.

Open question: should we address the `localStorageLens` complexity warning when cleaning up the remaining tsdoc flags, or leave it to whichever bead tracks that area?
