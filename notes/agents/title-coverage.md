# title.js coverage

- Unexpected hurdle: the existing title test covered the banner function but not the handle factory.
- Diagnosis: strict focused coverage identified the uncalled `createTitleHandle` function.
- Fix: added a direct assertion that the factory returns the exported banner function.
- Evidence: focused Jest coverage passed at 100% statements, branches, functions, and lines.

## Follow-up verification

- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/build/title.test.js test/core/build/title.coverage.additional.test.js --runInBand --coverage --silent --collectCoverageFrom='src/core/build/title.js' --coverageReporters=text-summary` — 2 suites, 2 tests passed; statements 2/2, branches 0/0, functions 2/2, lines 2/2.
