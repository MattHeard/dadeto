# Render variant core coverage

- Unexpected hurdle: the trigger’s inline optional/nullish snapshot reads kept branch coverage below 100% even though all statements were executed.
- Diagnosis: focused ESM coverage isolated the remaining outcomes to snapshot data and stored visibility normalization inside tree propagation.
- Fix: extracted pure normalization helpers, covered their absent/null/function/value outcomes directly, and added tests for propagation, option routing, pending paths, and persistence marker clearing.
- Next time: when branch counters remain below 100% around defensive expressions, isolate the normalization behavior into directly testable helpers while preserving semantics.

## Follow-up verification

- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/render-variant --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/render-variant/render-variant-core.js' --coverageReporters=text-summary` — 5 suites, 111 tests passed; statements 627/627, branches 322/322, functions 223/223, lines 619/619.
