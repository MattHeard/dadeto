# Local document store coverage

- The focused document-store suite passed at strict 100% coverage: 117/117 statements, 46/46 branches, 48/48 functions, and 114/114 lines across 24 tests.
- Fixed the aggregate coverage runner blocker by importing `jest` explicitly in `test/core/local/documentStore.test.js`.
- Acceptance command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/local/documentStore.test.js --runInBand --coverage --silent --collectCoverageFrom='src/core/local/documentStore.js' --coverageReporters=text-summary`.
- Next time: run the focused local slice first when the aggregate runner fails before writing its report.
