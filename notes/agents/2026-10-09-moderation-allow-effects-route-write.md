# Moderation route and assignment effects

- Unexpected hurdle: the moderation workflow had several older direct-injection tests that encoded Firestore writes in the core workflow fixtures.
- Diagnosis: adding a permission-first adapter at the command boundary exposed those fixtures during the full sharded test run; the focused test set did not include every legacy branch fixture.
- Chosen fix: move Express route registration, Firestore assignment persistence, and HTTP response sending behind cloud-owned permission-first adapters. Mint a fresh AllowEffects value for route setup and separately at request time for persistence and response writes. Keep assignment payload construction and merge semantics documented at the cloud adapter boundary.
- Next-time guidance: when migrating a command to AllowEffects, search for every direct workflow construction in the complete test tree before relying on local suites. Run `npm run check` to exercise all shards and local E2E.
- Evidence: `npm run check` passed all 10 gates; the test gate passed all unit coverage shards and 11 local E2E tests; duplication reported 0 clones; npm audit reported 0 vulnerabilities.
