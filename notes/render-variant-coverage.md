# Render-variant coverage

- Scope: every source file under `src/core/cloud/render-variant/`.
- Evidence command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/render-variant --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/render-variant/**/*.js' --coverageReporters=text-summary`
- Result: 5 suites and 111 tests passed; statements 657/657, branches 324/324, functions 231/231, lines 648/648.
- The run-entrypoint test now uses native `unstable_mockModule` setup for VM-module mode.
