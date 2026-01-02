# dadeto-ahx

- The bd daemon consistently hung up when starting (`bd ready`/`bd show`); it has been falling back to direct mode automatically, so no additional action was necessary.
- Added explicit JSDoc signatures for `makeHandleHideClick`, `makeHandleHideSpan`, and `toggleHideLink` to satisfy the compiler once strictNullChecks/strictFunctionTypes land, and documented the DOM helpers-backed callback shape for the generated hide span.
- `npm run lint` still reports warnings in `src/core/browser/presenters/battleshipSolitaireClues.js` around missing property descriptions/return docs; those existed prior to this change and require their own follow-up.

Open question: Should we aim to clear the battleship helper lint noise before enabling the remaining tsdoc flags, or schedule it under a dedicated bead?
