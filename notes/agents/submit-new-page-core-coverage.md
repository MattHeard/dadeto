# Submit new page core coverage

- Unexpected hurdle: the existing handler tests did not exercise the Firestore lookup helpers used to resolve pages, variants, and options.
- Diagnosis: the core's public submission flow delegates to several async query branches that were only indirectly represented.
- Fix: added focused query doubles covering invalid input, empty page/variant/option results, existing option resolution, and page variant validation.
- Next-time guidance: for request handlers with exported lookup helpers, test the query helpers directly to cover empty-result branches without overcomplicating HTTP fixtures.

## Follow-up verification

- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/submit-new-page --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/submit-new-page/submit-new-page-core.js' --coverageReporters=text-summary` — 4 suites, 23 tests passed; statements 128/128, branches 52/52, functions 49/49, lines 128/128.
