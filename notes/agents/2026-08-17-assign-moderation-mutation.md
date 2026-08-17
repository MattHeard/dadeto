# Assign moderation mutation slice

- Survivor scan identified `src/core/cloud/assign-moderation-job/assign-moderation-job-core.js`.
- Added assertions for absent dependency overrides, default dependency identity, getFirestore-only overrides, and omitted request bodies.
- Focused Stryker range evidence: 12 mutants, 12 killed, 0 survived, 0 timed out, 0 no-coverage mutants.
- Quality evidence: the two focused Jest suites passed 26 tests and `npm run lint` passed with zero warnings.
