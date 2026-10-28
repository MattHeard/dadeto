# Simulator filesystem lifetime and host configuration — 28 October 2026

Owning Bead `dadeto-7mqr`, child of Rank11 / `dadeto-e1oz`.

## Change

Core simulator construction now requires startup AllowEffects plus an explicit
platform. Native fs/promises, os and path operations live in a25-line local adapter;
the44-line native facade preserves `createLocalGcpSimulator(options)` and `clear()`.
Default public directory and environment are captured at native startup, with
explicit caller public directories (including empty string) preserved.

The new portable `storage-lifecycle.js` allocates with the startup permission and
captures only its returned root for permission-first cleanup. Native clear mints a
fresh permission per call; it does not reuse startup permission. The exact removal
flags remain recursive/force/maxRetries3/retryDelay50. Concurrent resources retain
independent roots; allocation and cleanup errors preserve their identity.

No new exclusion, suppression or lower threshold. The old whole-simulator Stryker
directive remains unchanged and is explicit parent debt; this slice claims mutation
acceptance only for the entire new unsuppressed lifecycle module. Remaining native
crypto, ambient clocks/console, existing value assertions and broad API types are
not solved here. The AST census now finds one core module /one static Node import,
`simulator.js` → `node:crypto`; this does not prove absence of ambient/dynamic effects.

## Hurdles and diagnosis

Initial portable red regression fails because the lifecycle module is absent,
`/tmp/dadeto-7mqr-red.log`. Initial16 then expanded21 focused tests pass. The new
portable simulator configuration fixture initially omitted the existing required
saveStorageFile adapter; completing that fixture makes its two cases pass.
One extra local statement exceeded the existing44-statement limit; directly
destructuring allocated root/clear avoids the extra statement without suppression.
A permission-review timeout on one scoped test edit succeeded on its one retry.

Concrete compiler fixtures check actual native platform implementations as well
as core signatures. They reject missing startup token/platform and allocation or
cleanup calls without permission. Existing entrypoint composition retains its
external options type after core's argument list changes.

## Evidence

- Focused: `node --experimental-vm-modules node_modules/jest/bin/jest.js
  --runInBand --coverage=false test/core/local/gcp-simulator
  test/local/gcp-simulator test/scripts/gcp-test-workflow.test.js
  test/scripts/playwright-entrypoint.test.js`:25 suites /164 tests PASS12.371s;
  `/tmp/dadeto-7mqr-all-focused-final.log`.
- Scoped: `TMPDIR=/home/matt/.cache/dadeto-task-tmp/playwright-runner npm run
  check:impact:run -- --files src/core/local/gcp-simulator/storage-lifecycle.js
  src/core/local/gcp-simulator/simulator.js
  src/core/local/gcp-simulator/simulator-entrypoint.js`:10 suites /49 tests PASS,
  all three sources have zero uncovered lines/branches, lint/core-parse/zero clones;
  `/tmp/dadeto-7mqr-impact.log`.
- `npm run check -- --skip-tests`:all11 static gates PASS, including native thin
  policy and compiler contracts; `/tmp/dadeto-7mqr-static.log`.
- `npm run build`, `npm run build:cloud`, `npm run verify:cloud-packages`:PASS,
  27 packages /713 modules /1,234 imports; `/tmp/dadeto-7mqr-{build,cloud-build,closure}.log`.
- Whole new lifecycle mutation: `TMPDIR=/home/matt/.cache/dadeto-task-tmp/playwright-runner
  node --experimental-vm-modules ./node_modules/.bin/stryker run
  docs/quality/simulator-storage-lifecycle.stryker.config.mjs`:PASS100%,3/3 Killed,
  static enabled (none generated), zero survivors/errors/timeouts/ignored/uncovered.
  Report matches source SHA-256
  `1f006eb2c1dca3c8b249b37164a5eeac2e3ed8e024e7e2be0b83f9f64c35c892`;
  `reports/mutation/simulator-storage-lifecycle{,-summary}.json`,
  `/tmp/dadeto-7mqr-mutation.log`.

Local/scoped evidence is not full-suite or global coverage evidence. Exact pushed
Full Check is required before closure. No actual Playwright, provider/production
request or deployment was run locally; native adapter tests mock filesystem work,
while existing simulator integration tests retain local temporary storage/HTTP.

## Next time

Expose filesystem allocation and cleanup as separate permission-first capabilities.
Test the startup and cleanup tokens independently; forwarding a startup token to a
later cleanup call can pass an ordinary happy-path resource test. Keep the native
external API stable by binding each invocation at the facade.
