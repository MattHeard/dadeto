# Payment webhook arity loop

- Unexpected hurdle: The wrapper defaults `env` to `process.env`, so a direct property read needed to preserve defaulting only when the property is undefined.
- Diagnosis: `createPaymentWebhookIndexHandler` destructured six dependencies from its named `deps` record at the function boundary.
- Chosen fix: Read each named dependency explicitly and preserve the original undefined-only environment fallback.
- Evidence: Payment-webhook Jest suites passed (29 tests), target no-cache lint and TSDoc passed, and `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates, 11 E2E tests, 100% line/statement/function/branch coverage, zero clones, and zero audit vulnerabilities. Cloud-only findings reduced from 4 to 3.
- Next-time guidance: Preserve default-parameter behavior explicitly when replacing destructuring. Next inventory candidate: `submit-moderation-rating/dependencies.js`.
