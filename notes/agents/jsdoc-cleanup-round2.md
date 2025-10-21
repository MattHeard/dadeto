# JSDoc cleanup round 2

- **Challenge:** eslint still flagged jsdoc/no-undefined-types on cloud functions because prior docs relied on DOM-specific types such as `RequestInit` and `RegExpMatchArray` that the rule set does not recognise. The fixtures in tests were also missing JSDoc entirely, triggering jsdoc/require-jsdoc.
- **Resolution:** Added local typedefs for more complex dependency bags, switched unsupported types to repository-friendly object annotations, and documented every helper that the linter targeted. Re-ran `npx eslint . --no-color --format=json -o reports/lint/lint.json` to confirm the `jsdoc/*` bucket is now clear.
