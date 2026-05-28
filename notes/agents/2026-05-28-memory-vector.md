# Memory Vector Retrospective

Unexpected hurdle: the first pass of the new toy was too monolithic for the repo's lint budget, and the initial build exposed a missing helper plus a dropped coverage floor.

Diagnosis path: I used the toy's focused Jest file and ESLint on only the new source/test files, then read the coverage footer to find the exact uncovered branches in `memoryVector.js`.

Chosen fix: I split the parser and lookup flow into smaller helpers, added explicit edge-case tests for blank input, missing paths, undefined values, and thrown string errors, and then rebuilt the generated blog assets so `MEMV1` landed in `public/blog.json`.

Next-time guidance: start new toys with a few tiny helper functions from the beginning, and add one coverage-oriented test for each branch you can see in the first lint or coverage report.
