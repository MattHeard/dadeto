# Hide variant HTML core coverage

- Unexpected hurdle: the existing deletion/removal suites left only low-level Firestore reference-chain and page-snapshot guards uncovered.
- Diagnosis: those helpers were already exposed through the module's test utilities, so no end-to-end trigger setup was needed for the final branches.
- Fix: added valid/invalid parent-chain cases and existing/missing page snapshot payload cases.
- Next-time guidance: inspect exported test utilities before building additional integration fixtures for defensive helper branches.

## Follow-up verification

- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/cloud/hide-variant-html --runInBand --coverage --silent --collectCoverageFrom='src/core/cloud/hide-variant-html/hide-variant-html-core.js' --coverageReporters=text-summary` — 4 suites, 45 tests passed; statements 162/162, branches 84/84, functions 66/66, lines 161/161.
