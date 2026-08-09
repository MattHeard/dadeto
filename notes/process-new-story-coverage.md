# Process-new-story coverage

- Scope: every source file under `src/core/cloud/process-new-story/`.
- Evidence command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/process-new-story --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/process-new-story/**/*.js' --coverageReporters=text-summary`
- Result: 1 suite and 10 tests passed; statements 90/90, branches 35/35, functions 39/39, lines 88/88.
