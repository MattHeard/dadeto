# Silt Margin authored valve scale

- Unexpected hurdles: the first changed-core evaluation found the added test pushed its enclosing suite over ESLint's function-length limit and missed the operator's default-parameter branch. The post-rebase full check then found a small jscpd clone between the Silt wrapper and generic valve operator.
- Diagnosis: scoped evaluation found the lint and coverage gaps; the aggregate gate showed that repeating the generic operator invocation created a clone even though the wrappers were otherwise independent.
- Fix: moved the authored-scale regression into a separate describe block, added a direct assertion that the default operator still opens at scale -4, and reduced the Silt adapter to a one-line factory around the shared generic operator.
- Verification: focused test passed (1 suite / 21 tests); latest changed-core evaluation passed (35 suites / 499 tests), ESLint, core-parse, zero clones, and 100% statements/branches on all changed core files. The first `npm run check` passed all gates before rebase; its post-rebase run detected the clone, which is now fixed. Build passed. Exact-head PR CI for the corrected commit remains pending.
- Next time: run the changed-core evaluator early, then run the duplication gate on the final adapter shape before waiting on the aggregate check.
