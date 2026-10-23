# OpenAI Chat Acceptance

## Machine-Checkable Criteria

- [x] Focused browser and cloud tests pass with injected mocks: `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --no-watchman --runTestsByPath test/core/browser/openai-chat-core.test.js test/core/cloud/openai-chat/openai-chat-core.test.js test/core/cloud/openai-chat/openai-chat-adapters.test.js`.
- [x] Cloud source packaging includes the `openai-chat` function: `npm run build:cloud`.
- [x] A usable static chat page is built and calls only the configured DADETO endpoint.
- [x] `npm run check` passes for the current feature slice; the live provider smoke and production configuration remain unverified.
- [x] The configured toy manual passes `npm run manuals:check`.
- [ ] A controlled live provider smoke is approved, run in a permitted environment, and recorded without logging the token or reply.
- [ ] Production configuration is reviewed and applied by the operator; both feature flags remain disabled until then.

## Evidence Collection

- Focused tests: `npm run test:impact -- --files test/core/cloud/billing/operation-billing-core.test.js test/core/cloud/get-author-uuid-v2/billable-operation.test.js test/core/cloud/openai-chat/openai-chat-core.test.js test/core/cloud/openai-chat/openai-chat-adapters.test.js test/core/browser/openai-chat-core.test.js test/browser/openai-chat-page.test.js` passed 76 tests.
- `TMPDIR="$PWD/.tmp/jest-tmp" DADETO_JEST_POOL_DIR="$PWD/.tmp/openai-jest-pool" DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates across six shards (7,495 tests); cloud build, site build, manuals check (82), TypeScript, core parsing, and zero-clone checks passed.
- Function and pricing configuration: infra/functions-openai-chat.tf and docs/toys/openai-chat/harness.md.
- Provider smoke evidence, if approved: record status and run identifier only; never record credentials or chat text.

## Pass/Fail Rules

- Pass implementation checks only when every corresponding command exits with status 0.
- The feature is not accepted as end-to-end until the static page and approved live smoke criteria pass.
- A local test pass is not live provider or production evidence.
