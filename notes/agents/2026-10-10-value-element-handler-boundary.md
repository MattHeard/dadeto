# Keep value element construction separate from its handler

- **Unexpected hurdle:** Several listener-disposal tests called
  `createValueElement` directly and depended on it to create the value handler,
  while the key identity attribute belongs to the row composition.
- **Diagnosis:** The value element factory assembled its handler from hidden
  field and row-state dependencies, then also created and registered the DOM
  input. `createKeyValueRow` already owns those dependencies and the current
  row key.
- **Fix:** The row builder now creates the value handler and initializes the
  value input's `prevKey`; `createValueElement` only creates the input,
  registers the supplied callback, and records listener cleanup.
- **Verification:** Focused browser tests passed (42 suites, 148 tests);
  targeted no-cache arity lint removed `createValueElement` and reduced
  `toys.js` from 11 findings to 10. `npm run check` passed (test group 1/1,
  11/11 local E2E tests, all 10 other gates, 0 clones, 0 vulnerabilities).
  Full output: `.tmp/npm-check-value-element.log`.
- **Next-time guidance:** Keep DOM element factories narrow; assemble
  row-specific behavior and identity at the caller that has the complete row
  context.
