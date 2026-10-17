# Interpretability graph identity and link checks

- Unexpected hurdle: the full check's parse-boundary classifier treats graph validation inside an ordinary core module as raw-input interpretation.
- Diagnosis: moved the pure graph check beside the interpretability schema factory in its existing boundary entrypoint; this preserved the public import while following the repository's boundary rule.
- Fix: mechanism records now have stable IDs, and `validateEvidenceGraphV1` reports duplicate IDs, malformed IDs, unresolved artifact references, and unresolved edge endpoints deterministically.
- Zod boundary: schema construction still accepts an injected Zod API. Interpretability tests use the local schema-builder double and plain graph fixtures; no test or core import requires the actual Zod package.
- Evidence: focused interpretability Jest passed 2 suites / 11 tests; `npm run check` passed all 10 gates, including 11 E2E tests, 100% line/statement/function/branch coverage (zero skipped), and zero clones. Full check log: `.tmp/interpretability-graph-check-final.log`.
- Next time: use the parse-boundary gate early when adding data interpretation to `src/core`, and use a focused branch coverage report before spending time on the full serial check.
