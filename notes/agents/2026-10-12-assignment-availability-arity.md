# Assignment availability arity cleanup

- Unexpected hurdle: the lint finding was in a four-argument function, but the last argument carried three interval facts and was immediately unpacked.
- Diagnosis: owner filtering and interval resolution were combined in `ownerIsFree`; its prepared interval state was a transport object at that call boundary.
- Fix: replaced that object with a pure `createOwnerAvailabilityChecker` factory. It prepares the point/segment indexes and proposed interval once, then returns a three-argument owner availability predicate. Callers reuse the checker for asset and custodian assignments.
- Evidence: six focused suites passed (61 tests); ESLint and TSDoc passed; target lint scan has 0 findings; fresh global scan fell from 21 findings/21 files to 20/20 (`.tmp/parameter-bag-global-after-assignment-intervals.json`); `npm run check` passed all 10 gates, including 11 local E2E tests and 0 clones; `npm run build` and `git diff --check` passed.
- Next time: start from the fresh global rule report. Next finding is `src/core/browser/toys/2026-08-21/conditionalAssignments.js:44` (effective arity 6). Inspect its decision/persistence split before editing.
