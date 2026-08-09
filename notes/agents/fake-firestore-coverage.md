# `src/core/local/gcp-simulator/fake-firestore.js` coverage

- Unexpected hurdle: the existing low-level suite left the default field-value clock and both ordering fallbacks unexecuted.
- Diagnosis: strict coverage isolated the default `orderBy` direction, descending comparison, and default `serverTimestamp` callback branches.
- Fix: added behavior assertions for default timestamps, descending ordering, and omitted ordering direction; the snapshot data method is also bound so detached Firestore-style reads remain valid.
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/local/gcp-simulator/fake-firestore.test.js --runInBand --coverage --silent --collectCoverageFrom='src/core/local/gcp-simulator/fake-firestore.js' --coverageReporters=text-summary` — 1 suite, 8 tests passed; statements 268/268, branches 121/121, functions 97/97, lines 263/263.
