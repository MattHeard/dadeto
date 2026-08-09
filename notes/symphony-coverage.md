# Symphony coverage

- Scope: every source file under `src/core/local/symphony/`.
- Evidence command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/local/symphony test/local/symphony.launch.test.js test/local/symphony.app.test.js test/local/symphony.launcherCodex.test.js --runInBand --coverage --silent --collectCoverageFrom='src/core/local/symphony/**/*.js' --coverageReporters=text-summary`
- Result: 10 suites and 59 tests passed; statements 561/561, branches 354/354, functions 130/130, lines 557/557.
- Updated the launch and app suites to use native VM-module imports and mocks.
