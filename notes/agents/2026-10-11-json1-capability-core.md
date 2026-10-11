# JSON1 capability core boundary (2026-10-11)

- Unexpected hurdle: the first full check correctly flagged `invokeCapability` as a parser/validator because it both validated a request and returned a result object.
- Diagnosis: the classifier intentionally treats object-returning input validation in ordinary core modules as parsing. The capability invocation module is an explicit core API boundary, while actual JSON parsing remains in the existing JSON1 implementation.
- Fix: placed the API in `src/core/capabilities/index.js`, a recognized boundary module, and kept JSON1 parsing delegated to the existing toy. The registry is a private `Map` with one direct function binding; public metadata omits callable bindings. Unknown IDs produce a stable coded error and are never used as module paths.
- Evidence: focused Jest passed 1 suite / 8 tests; scoped ESLint and TSDoc passed; elevated `npm run core-parse` passed; full elevated `npm run check` passed all 10 gates with 100% lines/functions/statements/branches, local E2E 11/11, zero clones, and zero audit vulnerabilities. Coverage artifact: `reports/coverage/coverage-summary.json`.
- Follow-up: add a narrow private HTTP adapter and MCP tool that both call this core entrypoint; complete a real Codex/ChatGPT invocation before calling the Notion spec implemented.
- Next-time guidance: treat the exported capabilities index as the boundary; keep adapters as translations and never accept module/export names from callers.
