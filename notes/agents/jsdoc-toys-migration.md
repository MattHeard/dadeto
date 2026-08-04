# JSDoc toys migration

- Unexpected hurdle: the checked-in lint report retained diagnostics from an earlier run after targeted fixes.
- Diagnosis: `toys.js` was checked directly with ESLint and the JSDoc TypeScript project.
- Fix: replaced generic callback, wildcard, and `{@code}` annotations with valid project-local types and Markdown inline code.
- Next-time guidance: use targeted ESLint output and `npm run tsdoc:check` as the evidence source before relying on `reports/lint/lint.txt`.
- Follow-up: bounded test-file lint runs work under the constrained machine; group only a few files per evaluator invocation.
