# Payment webhook deferred event replay

- Unexpected hurdle: the first full `npm run check` hit the one-hour timeout, and `non-core-thin` flagged an oversized cloud adapter after deferred replay was added. Review also found that replay rescanned after quarantined outcomes, which could repeatedly revisit an unchanged deferred reader result.
- Diagnosis: global coverage is strict and slow; persistence logic belongs in Core, and only an applied state transition justifies rescanning the queue.
- Fix: move persisted-event validation/serialization into Core, keep the cloud adapter focused on querying and ordering deferred records, and rescan only after an applied replay. Add coverage for replay/no-progress, quarantined outcomes, and optional persisted data branches.
- Evidence: focused webhook suite passed (32 tests); targeted ESLint and `git diff --check` passed. `DADETO_CHECK_TIMEOUT_MS=7200000 npm run check` passed all 10 aggregate stages, including all unit coverage and 11 local E2E tests; duplication reported 0 clones; non-core-thin checked 326 files.
- Next-time guidance: allow enough time for the serial coverage suite and E2E phase; check adapter size early when introducing Firestore behavior. Billing remains incomplete until atomic financial mutation, restart-safe idempotency, and reordered-event behavior satisfy the full spec.
