# Document facade mutation loop

- Unexpected hurdle: the focused document tests exercised most helpers but did not assert delegated arguments, exact API errors, null sibling behavior, or dynamic-import completion.
- Diagnosis: isolated Stryker initially reported 47 survivors and one loop timeout; incremental mock-call/state/error assertions reduced survivors to zero, and the timeout came from removing the body of a `while` loop.
- Fix: strengthened `test/core/browser/document.test.js` and rewrote `removeAllChildren` as a single-statement loop.
- Next-time guidance: treat exact delegated side effects and mutation-induced non-termination as separate acceptance checks; record both survivor and timeout counts.
