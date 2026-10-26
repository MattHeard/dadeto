# OpenAI chat core coverage increment — 2026-10-26

## Hurdle and diagnosis

The CI coverage artifact identified 10 uncovered browser-controller branch arms and 27 cloud-core arms. The cloud duplicate-cache branch required the mocked first cache read to miss and the second to return the stored result; returning the result on the first read skipped the intended branch. Removing the cloud helper's unreachable record-type guard also required making its authenticated-record precondition explicit in JSDoc. TypeScript needed an explicit number annotation for `codePointAt` inside the nonempty string iteration.

## Fix and evidence

Added public behavior regressions for browser send/error recovery and cloud request validation, authentication, billing, reservation, provider-response, and UTF-8 size-limit cases. Removed the unnecessary cloud helper guard and encoded its caller invariant. No live provider calls, credentials, or spend were used.

- Browser scoped evaluator: `npm run check:impact:run -- --files src/core/browser/openai-chat-core.js test/core/browser/openai-chat-core.test.js` — passed; 3 suites / 30 tests; source file has no uncovered lines or branches.
- Cloud scoped evaluator: `npm run check:impact:run -- --files src/core/cloud/openai-chat/openai-chat-core.js test/core/cloud/openai-chat/openai-chat-core.test.js` — passed; 2 suites / 52 tests; source file has no uncovered lines or branches.
- `npm run build:cloud` and `npm run build` completed before the final JSDoc-only refinement; build logs are under `/tmp/dadeto-chat-2026-10-26-cloud-build.log` and `/tmp/dadeto-chat-2026-10-26-site-build.log`.
- `npm run check` — passed all 10 gates, 0 failures; progress report `/tmp/dadeto-chat-2026-10-26-check-final.log`; duplication reported 0 clones.
- `git diff --check` — passed.

## Next time

Use cache mocks that reproduce the actual first-miss/second-hit sequence when testing duplicate idempotency. Keep the global Full Check bead open until authoritative CI proves every global metric; scoped coverage does not establish suite-wide completion. Paid provider smoke remains separately blocked by the identity, secret, pricing, and approved-provider prerequisites in `dadeto-1adj`.
