# Neon handheld menu wrapping

- **Unexpected hurdle:** Neon labels were sliced at 30 characters in the shared Mosslight renderer, so longer rows lost their ending on the 160×144 display.
- **Diagnosis:** The controller renderer used `slice(0, 30)` after Neon had already constructed its menu rows; this made all presenters inherit the same silent truncation.
- **Fix:** Wrap words to the 30-character pixel-font width, split overlong tokens, and exercise the shared canvas path with the reported “Short scenarios / replace this slot” label.
- **Next time:** Keep authored menu rows unchanged for navigation semantics; fix fit/layout at the shared presentation boundary and check both line width and vertical room.
- **Evidence:** `./node_modules/.bin/jest --runInBand --coverage=false --runTestsByPath test/core/browser/game/mosslightRenderer.test.js` passed (11 tests); `npm run check` passed all 10 gates, including full coverage, browser tests, zero clones, and audit.
