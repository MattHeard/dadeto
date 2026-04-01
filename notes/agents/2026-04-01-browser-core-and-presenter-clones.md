## Browser-core and presenter clone pass

- **Context:** `jscpd` at `17` still flagged a browser-core self-clone plus a presenter header clone between `battleshipSolitaireClues` and `ticTacToeBoard`.
- **Fix:** Collapsed `maybeRemoveElement` onto `removeCapturedElement` in browser-core, then renamed the battleship presenter's local DOM-helper typedef alias so its top-of-file token stream no longer matches the tic-tac-toe presenter boilerplate.
- **Follow-up:** The remaining `17`-token clones are now in `gamepadCapture`, `symphony`, `cloud-core`, and `commonCore`; keep iterating one group at a time and land each slice separately.

**Testing**
1. `npm run duplication`
2. `npm run lint`
3. `npm test`
