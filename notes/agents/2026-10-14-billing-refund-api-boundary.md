# Billing refund mutation boundary

- Unexpected hurdle: the intent based refund path and webhook matching were in place, but `createBillingRuntime` still exposed an older mutation that could reverse a purchase lot without a persisted DADETO refund intent.
- Diagnosis: production webhook dispatch no longer called the legacy method, but its public runtime export remained an alternate path around the spec's refund authority rule.
- Fix: remove `applyRefundEvent` from the runtime type and returned service, delete its transaction helper and obsolete direct mutation tests, and add an API surface regression asserting the no-intent mutation is absent.
- Next time: search exported runtime services as well as production call sites when enforcing a protocol invariant; unused public methods can still be called by future compositions.
- Evidence: six focused billing/refund/webhook suites passed (97 tests); `npm run tsdoc:check` passed; strict ESLint passed for the modified runtime and tests; `DADETO_CHECK_TIMEOUT_MS=3600000 npm run check` passed all 10 gates, with all four coverage metrics at 100%, zero clones, zero audit vulnerabilities, and 11 local E2E tests passed. `rg` found no production `applyRefundEvent` references.
