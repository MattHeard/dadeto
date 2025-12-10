## Context
- `jscpd` still reported two clones: the CSV parser’s repeated guard in `toys-core` and the duplicate validation-pattern in the battleship clue helpers.
- The toy guard duplication was easy to spot once you look at `CsvLineParser.consume` and `consumeNonQuote`, both of which did `if (guard) { advance; return; } this.appendCurrentChar()`.
- The clue helpers both re-implemented the `find-first-error-message` pattern, so the duplication report referenced the same 12-line block in the presenter and toy modules.

## Fix
- Extracted `consumeWithAdvance` to centralize the guard/check structure, letting `consume` and `consumeNonQuote` share the advance/append workflow without reproducing the three-line block (see `src/core/browser/toys/toys-core.js`).
- Introduced `getFirstErrorMessage` in `src/core/common-core.js` and routed both `presenters/battleshipSolitaireClues` and `toys/2025-05-11/battleshipSolitaireClues` through it to remove their duplicated `findValidationError`/`computeFleetError` logic.
- Added the shared `createElementRemover` helpers and the `_dispose` guard to `browser-core` to keep the cleanup helpers centralized while still satisfying the lint requirements on complexity and JSDoc.
- Ran `npm run duplication`, `npm run lint`, and `npm test` after the refactor to confirm the tooling no longer flags the clones.

## Lessons & open questions
- The CSV parser’s guard logic still needed a helper even though it only existed twice—the duplication report focuses on literal blocks, so any repeated control flow should be factored early.
- Open question: should we look for other repeated “first matching predicate” helpers elsewhere in the toys/presenter layer and share `getFirstErrorMessage` more widely before new clones accumulate?
