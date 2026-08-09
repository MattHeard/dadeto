# Payment-webhook coverage

- Scope: every source file under `src/core/cloud/payment-webhook/`.
- Evidence command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/payment-webhook --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/payment-webhook/**/*.js' --coverageReporters=text-summary`
- Result: 2 suites and 18 tests passed; statements 59/59, branches 51/51, functions 15/15, lines 55/55.
- The wrapper coverage test now uses native `unstable_mockModule` setup for VM-module mode.
