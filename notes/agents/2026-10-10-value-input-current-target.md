# Value input handlers use their current target

- **Unexpected hurdle:** The first full check exposed renderer fixtures that do
  not implement `getDataAttribute`; focused handler tests had not exercised all
  key/value rendering paths.
- **Diagnosis:** Value handlers were reading the key element captured by the
  factory. Moving row identity onto the value input required initializing that
  attribute and keeping it synchronized after a valid key rename.
- **Fix:** Initialize the value input's `prevKey` from the key input's current
  value, read it from the value event's `currentTarget`, and update the adjacent
  value input when the key handler successfully migrates a row. Preserve
  keyless standalone renderer cases with optional key access.
- **Verification:** Targeted browser regressions passed (70 suites, 292 tests);
  `npm run check` passed (test group 1/1, 11/11 local E2E, all 10 other gates,
  0 clones, 0 vulnerabilities). Full output: `.tmp/npm-check-value-input-handler.log`.
- **Next-time guidance:** When a handler moves state from a captured sibling to
  `currentTarget`, test both rename propagation and renderer fixtures that use
  incomplete DOM doubles before running the full sharded suite.
