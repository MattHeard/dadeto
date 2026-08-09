# Mobile controls coverage

- Target: `src/core/browser/inputHandlers/mobileControls.js`
- Evidence: the focused Jest suite passed 4 tests with strict 100% thresholds for statements, branches, functions, and lines.
- Command: `npx jest test/browser/inputHandlers/mobileControlsHandler.test.js --runInBand --coverage --silent --collectCoverageFrom=src/core/browser/inputHandlers/mobileControls.js --coverageReporters=text-summary --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: statements 53/53, branches 4/4, functions 14/14, lines 50/50.
