# Browser main coverage

- Unexpected hurdle: the last uncovered item was a callback created for the output dropdown, not an untested branch.
- Diagnosis: focused Istanbul counters identified the callback at `src/core/browser/main.js:198`.
- Fix: the focused test now models the dropdown initializer invoking the output handler, which invokes the production data callback.
- Evidence: `npx jest test/core/browser/main.coverage.test.js --watchman=false --runInBand --coverage --coverageThreshold='{"global":{"branches":0,"functions":0,"lines":0,"statements":0}}'` reports `main.js` at 100% for statements, branches, functions, and lines.
