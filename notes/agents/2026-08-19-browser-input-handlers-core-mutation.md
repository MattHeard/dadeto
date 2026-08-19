# Browser input handlers core mutation slice

- Unexpected hurdle: callback construction was covered only indirectly, so the updater’s returned function could be replaced with an inert callback without a direct behavioral failure.
- Diagnosis: no test invoked `createUpdateTextInputValue` with a target value and checked both synchronization destinations.
- Chosen fix: added a focused updater test that invokes the returned event handler, verifies the DOM setter call, and reads back the persisted input value.
- Evidence: the final Stryker scan for `src/core/browser/inputHandlers/browserInputHandlersCore.js` instrumented 27 mutants and killed all 27 with 0 survivors and 0 timeouts; the focused Jest suite passed 1 test, targeted ESLint passed with zero warnings, and `git diff --check` passed.
- Next-time guidance: invoke higher-order callback factories at their public boundary and assert every externally visible side effect.
