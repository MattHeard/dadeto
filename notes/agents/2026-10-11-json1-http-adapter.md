# JSON1 private HTTP adapter (2026-10-11)

- Unexpected hurdle: the first full check found branch coverage at 99.977% because the adapter's coded invalid-invocation and unexpected-error branches were not exercised.
- Diagnosis: malformed request bodies are rejected before the capability registry is called, so they cannot cover the registry's `INVALID_INVOCATION` path. The route also deliberately rethrows unknown failures and needed an explicit assertion for that contract.
- Fix: added route cases for coded invalid-invocation responses and unexpected-error propagation. The route checks the socket peer address, accepts only a string input and route capability ID, invokes only through the fixed registry, and maps known errors to structured HTTP responses.
- Evidence: focused local server tests passed 15 tests; TSDoc and `npm run build:cloud` passed; `npm run check` passed all 10 gates, with lines/statements/functions/branches at 100%, local E2E 11/11, zero clones, and zero audit vulnerabilities. Full log: `/tmp/dadeto-json1-http-check.log`.
- Follow-up: add the thin MCP adapter and verify the same core JSON1 behavior through both adapters. Real-agent validation remains required before the Notion capability spec is complete.
- Next-time guidance: when an adapter delegates a coded error contract, test invalid invocation and unclassified errors separately from malformed transport input.
