# Render-author coverage

- Scope: every source file under `src/core/cloud/render-author/`.
- Evidence command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/render-author --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/render-author/**/*.js' --coverageReporters=text-summary`
- Result: 2 suites and 14 tests passed; statements 56/56, branches 48/48, functions 13/13, lines 50/50.
- The run-entrypoint test now uses native `unstable_mockModule` setup for VM-module mode.
