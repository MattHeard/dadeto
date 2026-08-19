# createSectionSetter mutation slice

- Unexpected hurdle: the `result.ok && Boolean(result.data)` guard had an equivalent surviving logical-operator mutant because the failure variant cannot contain `data`.
- Diagnosis: the parser result is a discriminated union, so checking `result.ok` already proves the success data exists; an artificial failure carrying data is outside the contract.
- Chosen fix: removed the redundant Boolean check and retained the existing valid-object and non-object input tests.
- Evidence: the post-fix guard scan produced 0 mutants and passed its 7-test dry run; the plain-object validation scan for `src/core/browser/createSectionSetter.js:62-66` killed all 9 mutants with 0 survivors and 0 timeouts; targeted ESLint and `git diff --check` passed.
- Next-time guidance: when a survivor is equivalent under a typed result contract, tighten the implementation to the discriminant instead of inventing an unreachable test fixture.
