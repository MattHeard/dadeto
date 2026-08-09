# Render contents core coverage

- Unexpected hurdle: the stale inventory understated the final gap; the focused report isolated one default-visibility fallback.
- Diagnosis: a variant document without a `visibility` field was not represented in the existing story-fetch fixtures.
- Fix: added a genuine integration-style fixture proving missing visibility defaults to visible.
- Next time: include absent optional Firestore fields alongside explicit visible and hidden fixtures.

## Follow-up verification

- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/render-contents --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/render-contents/render-contents-core.js' --coverageReporters=text-summary` — 4 suites, 65 tests passed; statements 327/327, branches 140/140, functions 127/127, lines 325/325.
