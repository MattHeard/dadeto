# Hi-lo card game mutation slice

- Survivor scan identified `src/core/browser/toys/2026-03-01/hiLoCardGame.js` after clearing `submit-shared.js`.
- Added strict empty/non-string input boundaries, card-rank lower and upper boundaries, strict higher/lower guess assertions, and complete named-card formatting assertions.
- Removed redundant input-presence branching that had equivalent survivors.
- Focused per-test Stryker ranges covered all executable sections: every range reported zero surviving, timeout, and no-coverage mutants.
- Quality evidence: the focused Jest suite passed 29 tests and `npm run lint` passed with zero warnings.
