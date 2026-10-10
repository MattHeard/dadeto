# Keep type element construction separate from row behavior

- **Unexpected hurdle:** The first complete check found the branch where a
  missing `prevKey` falls back to the original row key was not exercised after
  moving type-change behavior into the row builder.
- **Diagnosis:** `createTypeElement` now receives a row-local callback, so the
  previous direct factory tests no longer covered row type mutation, renamed
  key selection, or the hidden-field sync contract.
- **Fix:** The row builder composes type changes from its current key, row data,
  and hidden-field dependencies. The integration regression now covers both
  the missing-key fallback and a key rename followed by a type change.
- **Verification:** Five focused suites passed (55 tests); targeted no-cache
  arity lint removed `createTypeElement` and reduced `toys.js` from 10 findings
  to 9. `npm run check` passed with test group 1/1, 11/11 local E2E tests, all
  10 other gates, 100% branch coverage, 0 clones, and 0 vulnerabilities. Full
  output: `.tmp/npm-check-type-element.log`.
- **Next-time guidance:** When moving stateful callbacks to their composition
  boundary, retain explicit tests for fallback branches that used to be owned
  by the factory.
