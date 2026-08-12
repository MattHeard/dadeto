# Billing hardening implementation note

- Unexpected hurdle: the first `npm run check` failed to spawn Node with `EPERM` inside the restricted execution environment.
- Diagnosis: elevated execution ran Jest successfully; the failure was environmental. The full check then exposed genuine TypeScript, lint, duplication, and core-parse failures.
- Chosen fix: require separate `operationType` and `operationAttemptId`, persist webhook inbox status before and after processing, gate purchase mutations through the transition graph, and verify Stripe against raw bytes only.
- Current evidence: focused billing and webhook suites pass; `npm run tsdoc:check` passes after the webhook type fix; full check still needs repository-wide lint/duplication/core-parse cleanup and a fresh full test run after the wrapper fixture change.
- Next guidance: do not use parsed request bodies for Stripe verification, and treat `received`/`deferred` inbox rows as retryable rather than terminal duplicates.
