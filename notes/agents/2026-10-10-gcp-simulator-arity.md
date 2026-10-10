# GCP simulator parameter-bag cleanup

- Unexpected hurdle: the simulator composes several broad adapter records, and trigger callbacks must keep their request-time effects permission binding intact.
- Diagnosis: the findings came from destructuring named simulator contracts for generated stats dependencies, test helpers, and trigger handlers. These records are meaningful boundaries; scattering them into flattened call-site values would make the simulator wiring harder to follow.
- Fix: gave the three contracts named JSDoc types and accessed their fields directly. The onWrite registration still binds the AllowEffects capability around each dispatched change; test helper behavior remains unchanged.
- Evidence: focused Jest passed (3 suites, 23 tests); scoped ESLint, `npm run tsdoc:check`, and `git diff --check` passed; all 10 `npm run check` gates passed, including 0 clones and 0 audit vulnerabilities (`.tmp/npm-check-parameter-bag-simulator.log`). Fresh file scan: `.tmp/parameter-bag-simulator.scan.json` (0). Global scan: `.tmp/parameter-bag-global-after-simulator.json` (94 findings).
- Next guidance: the next cluster with two findings in a central cloud module is `src/core/cloud/cloud-core.js`: `createFirestoreDocumentOnWriteTrigger` and `createVerifyAdmin`. Preserve the optional Firestore database adapter path and all admin rejection responses/logging.
