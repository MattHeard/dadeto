# API key credit startup effect boundary

- Unexpected hurdle: the shared Firebase manager is used by several core compositions, so requiring a startup capability in its signature would touch multiple unrelated entrypoints in one loop.
- Diagnosis: a type-first probe surfaced those callers and showed this was broader than the first bounded contract; the partial shared API edit was reverted.
- Chosen fix: migrate the get-api-key-credit-v2 cloud composition as a complete slice. A synchronous startup boundary scopes the AllowEffects token to one-time Firebase initialization and Firestore construction. The HTTP boundary continues to mint fresh request capabilities.
- Verification: the two focused endpoint suites passed (4 tests), targeted ESLint and tsdoc:check passed, and npm run build passed. npm run check quality gates passed, but its aggregate npm test step failed when a coverage worker exceeded its 512 MB heap even with shard sizes 20 and 10. The bead stays open pending a successful aggregate test run and broader Firebase manager migration.
- Next time: split shared initialization migration by composition path; use the failing shard evidence to identify whether one test file exceeds the worker limit before changing the coverage harness.
