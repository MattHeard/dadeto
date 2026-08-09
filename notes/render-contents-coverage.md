# Render-contents coverage

- Scope: every source file under `src/core/cloud/render-contents/`.
- Evidence command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/render-contents --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/render-contents/**/*.js' --coverageReporters=text-summary`
- Result: 4 suites and 65 tests passed; statements 355/355, branches 140/140, functions 139/139, lines 352/352.
- The entrypoint test now uses native `unstable_mockModule` setup for VM-module mode.
