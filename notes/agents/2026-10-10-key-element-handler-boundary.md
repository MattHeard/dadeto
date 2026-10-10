# Keep key element construction separate from its handler

- **Unexpected hurdle:** The key element tests assumed the element factory
  created and configured its own key handler, so the refactor needed to move
  that integration assertion to the row builder boundary.
- **Diagnosis:** `createKeyElement` was responsible for both DOM construction
  and assembling a key handler from row state, hidden-field, and sync
  dependencies. The factory only needs the completed callback to wire its
  listener and disposer.
- **Fix:** `createKeyValueRow` now creates the handler and passes it to
  `createKeyElement`; the element factory receives only DOM, key, handler, and
  disposer dependencies.
- **Verification:** Five focused suites passed (34 tests); targeted no-cache
  arity lint removed `createKeyElement` and reduced `toys.js` from 12 findings
  to 11. `npm run check` passed (test group 1/1, 11/11 local E2E tests, all 10
  other gates, 0 clones, 0 vulnerabilities). Full output:
  `.tmp/npm-check-key-element.log`.
- **Next-time guidance:** For factories that mix DOM creation and event
  behavior, move handler assembly to the composition boundary and keep the
  element factory responsible for registration and cleanup only.
