# `src/core/local/gcp-simulator/playwright-runner.js` coverage

- Existing focused tests cover the runner completely, including port selection, default spawning, and server lifecycle behavior.
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/local/gcp-simulator/playwright-runner.test.js test/core/local/gcp-simulator/playwright-runner.port.test.js test/core/local/gcp-simulator/playwright-runner.default-spawn.test.js --runInBand --coverage --silent --collectCoverageFrom='src/core/local/gcp-simulator/playwright-runner.js' --coverageReporters=text-summary` — 3 suites, 13 tests passed; statements 100/100, branches 51/51, functions 26/26, lines 100/100.
