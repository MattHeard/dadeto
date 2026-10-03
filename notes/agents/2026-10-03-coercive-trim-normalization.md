# Coercive trim normalization

Segment IDs and CSV text duplicated `String(value ?? '').trim()`.
`normalizeTrimmedString` now lives beside `normalizeNonStringValue` in browser
validation, reusing its existing nullish fallback and coercion policy.
The public `normalizeSegmentId` export is retained as an alias; CSV text uses
the same primitive. Strict string-only normalizers are deliberately unchanged.

The shared import exposed two private tautological CSV forwarding wrappers.
Their call sites now invoke the canonical primitive directly; no wrapper-rule
exemption was introduced. The separate missing-indexed-cell `'undefined'`
marker and record-prefix fallback remain unchanged.

Regression coverage distinguishes numbers, false, symbols, nullish values,
single-call object coercion, and thrown coercion errors.
All 136 toy/validation/formatter suites (1,227 tests) pass; all four coverage
metrics are exactly 100% for validation, spacetime input, and the CSV converter.
Artifacts: `.tmp/shared-trim-normalization-final-tests.log`,
`.tmp/shared-trim-normalization-final-coverage`.
Final static aggregate passes nine gates, with duplication alone failing at
117 clones (119 before extraction), strict minTokens 14 unchanged.
Artifact: `.tmp/shared-trim-normalization-final-static.log`.
