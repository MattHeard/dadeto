# Mark variant dirty arity loop

- Unexpected hurdle: The parameter-bag lint reported the handler workflow at the function declaration line, not at the destructuring declaration itself.
- Diagnosis: `processHandleRequest` accepted a named `handlerDeps` record but unpacked five properties together at function entry.
- Chosen fix: Read each handler dependency explicitly from `handlerDeps`; keep the request and handler flow unchanged.
- Evidence: The mark-variant-dirty Jest suites passed (72 tests), target no-cache lint and TSDoc passed, and `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates, 11 E2E tests, 100% line/statement/function/branch coverage, zero clones, and zero audit vulnerabilities. Cloud-only findings reduced from 5 to 4.
- Next-time guidance: Match a lint report to the parameter record rather than assuming its line is the destructuring statement. Next inventory candidate: `payment-webhook/payment-webhook-core.js`.
