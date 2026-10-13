# Billing refund inbox atomicity

- Unexpected hurdle: the fake Firestore transaction does not implement `set(ref, value, { merge: true })`; the first version replaced the existing inbox row and dropped its verified event payload.
- Diagnosis: transaction batching supports reads and replacement writes, but not merge semantics. A transactional read before any writes gives a complete row that can be safely rewritten.
- Fix: in the successful confirmed-refund transaction, read `payment-events/{eventId}` before writes, then set its existing fields with `status: applied` alongside the refund intent, purchase, credit lot, balance, and ledger updates.
- Evidence: `test/core/cloud/billing/billing-runtime-core.test.js` passed (1 suite / 39 tests); targeted ESLint, `npm run tsdoc:check`, and `git diff --check` passed. `DADETO_CHECK_TIMEOUT_MS=7200000 npm run check` passed all 10 gates, including 11 local E2E tests and 0 clones.
- Next step: extend atomic inbox updates to other financial purchase transitions, then add restart-safe duplicate/reordered-event tests. This slice only covers confirmed successful DADETO refund intents.
