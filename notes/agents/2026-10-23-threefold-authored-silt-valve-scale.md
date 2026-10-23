# Silt Margin authored valve scale

- Unexpected hurdle: the first changed-core evaluation found the added test pushed its enclosing suite over the ESLint function-length limit, and coverage exposed the operator's default-parameter branch.
- Diagnosis: scoped evaluation surfaced both before the aggregate check; the integration path itself passed.
- Fix: moved the authored-scale regression into a separate describe block and added a direct assertion that the default water operator still opens at scale -4.
- Verification: focused test passed (1 suite / 21 tests); changed-core evaluation passed (35 suites / 498 tests), ESLint, core-parse, zero clones, and 100% statements/branches on all changed core files. `npm run check` passed all 10 gates; `npm run build` passed. Exact-head PR CI remains pending.
- Next time: run the changed-core evaluator immediately after adding scale-driven interaction behavior; it catches both default branches and test-structure lint limits efficiently.
