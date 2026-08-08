# dadeto-unr build TSDoc cleanup

- Unexpected hurdle: `tsdoc:check` still exits nonzero because the repository has unrelated cloud/local diagnostics, so the acceptance signal had to be filtered to `src/core/build`.
- Diagnosis path: isolated 12 diagnostics in `buildCore.js`, `copy-cloud.js`, and `cyclomatic-factors.js`; added explicit option/path contracts and guarded optional AST fields without changing runtime behavior.
- Chosen fix: introduced reusable formatter option typedefs, typed the injected path adapter boundary, and narrowed AST node names/locations before use.
- Evidence: focused Jest passed 3 suites / 44 tests; `awk '/^src\\/core\\/build\\//{n++} END{print n+0}' tsdoc-check-output.txt` reports 0 diagnostics; targeted ESLint has no errors and only the pre-existing `traverseNode` complexity warning.
- Next-time guidance: the aggregate gate remains blocked by Node 22 subprocess `EPERM`, npm audit findings, unrelated lint warnings, and non-build TSDoc errors.
