# Check coverage follow-up

- Unexpected hurdle: the full check initially stopped at 99.896% branch coverage, and non-escalated `core-parse`/audit runs hit subprocess and network permissions.
- Diagnosis: the coverage report identified unreachable nullish fallbacks in Symphony and the dependency graph, plus two genuinely untested admin-token paths.
- Fix: removed fallbacks whose invariants already guarantee initialized objects, and added focused tests for the admin token and dependency-graph paths.
- Verification: individual lint, TSDoc, dependency, parse, duplication, entrypoint, thin-file, export, audit, unit coverage, and E2E gates passed.
