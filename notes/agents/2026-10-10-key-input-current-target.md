# Key input handler current target

- **Unexpected hurdle:** Removing `keyEl` from the key-handler factory surfaced test adapters that invoked the handler without a DOM `currentTarget` helper or realistic listener context.
- **Diagnosis path:** The production listener is attached directly to the key input, and `dom.getCurrentTarget` is already the shared DOM abstraction. Focused tests identified the remaining mocks and one test that provided only `event.target`.
- **Chosen fix:** The handler now reads its element from `currentTarget`, drops the redundant factory option, and uses the same listener element for reading and updating `prevKey`. Added a regression where `target` differs from `currentTarget`; updated the caller and tests to model the registered listener.
- **Evidence:** Focused Jest passed (3 suites, 27 tests); the targeted arity diagnostic removed `createKeyInputHandler` and reduced `src/core/browser/toys.js` from 14 findings to 13. `npm run lint`, `npm run tsdoc:check`, and `npm run check` passed; local E2E passed 11/11, all 10 non-test gates passed, duplication found 0 clones, and audit found 0 vulnerabilities. Full check log: `.tmp/npm-check-key-input-handler.log`.
- **Next-time guidance:** For event handlers registered on an element, derive the listener element from `currentTarget`; this keeps handler factories from capturing element references that the event already carries.
- **Next loop:** Continue with the next live parameter-bag finding in `src/core/browser/toys.js`; keep the per-function scope and no-suppression check.
