# Browser data coverage

- Added focused tests for permanent-data validation, null storage fallbacks, injected storage lenses, and legacy wrappers.
- Acceptance command: `NODE_OPTIONS=--experimental-vm-modules npx jest test/browser/data.test.js test/browser/data.blogStatusSource.test.js test/browser/data.blogStatusUndefined.mutantKill.test.js test/browser/data.fetchErrorStatus.test.js test/browser/data.internalKeys.mutant.test.js test/browser/data.restoreBlogState.test.js test/browser/data.blogStatusConstants.test.js --runInBand --coverage --silent --collectCoverageFrom='src/core/browser/data.js' --coverageReporters=text-summary`
- Evidence: 60 tests passed; statements 164/164, branches 59/59, functions 66/66, lines 160/160.
- Next time: when a coverage run is below 100%, inspect the JSON coverage map for exact uncovered branches before adding tests.
