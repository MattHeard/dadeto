# Firestore helper parameter-bag cleanup

- Unexpected hurdle: cache eligibility depends on identity equality across the caller's Firestore dependencies and the process defaults, while a resolver also carries a wider but cohesive configuration.
- Diagnosis: `isDefaultFirestoreContext` combined two distinct contexts in one destructured parameter. The resolver's destructured fields already form one named dependency contract, so they should remain together but be read as such.
- Fix: made cache eligibility take separate caller and default context records; named the resolver dependency type and retained it as a direct record. Added a regression test for exact function and environment identity matching.
- Evidence: focused Jest passed (4 suites, 32 tests); scoped ESLint, TSDoc, and `git diff --check` passed; all 10 `npm run check` gates passed (`.tmp/npm-check-parameter-bag-firestore-helpers.log`), with 0 clones and 0 audit vulnerabilities. Target no-cache scan: `.tmp/parameter-bag-firestore-helpers.scan.json` (0). Global scan: `.tmp/parameter-bag-global-after-firestore-helpers.json` (90 findings).
- Next guidance: the next two findings are in `src/core/cloud/process-new-story/process-new-story-core.js`: `createProcessNewStoryHandle` and `processStorySubmission`. Preserve the existing request-time effect permission and batch write lifecycle.
