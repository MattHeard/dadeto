# Complete simulator readiness lines — 28 October 2026

Owning Bead `dadeto-y3se`, parent Rank11 / `dadeto-e1oz`; discovered during
`dadeto-aaxq` capability extraction.

## Hurdle and diagnosis

The old simulator banner regex matched a digit prefix without a terminator.
A stdout chunk ending in `http://127.0.0.1:4` resolved port4 before a later
`321` completed the actual4321. This predates the platform refactor.
The native server uses console.log, which writes a complete newline-ended banner.
The writer protocol already has a `/writer/` delimiter after the port digits.

## Fix

Require optional single CR followed by LF after simulator port digits. Preserve
leading log text, output forwarding, buffers, token identity, lifecycle and writer
protocol. This deliberately waits for a complete line rather than treating a
current buffer end as proof that the port is complete.

## Evidence

Red: `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand
--coverage=false --runTestsByPath
test/core/local/gcp-simulator/playwright-runner.injection.test.js`:
14 new failures /18 existing passes, `/tmp/dadeto-y3se-red.log`.

Green focused eight suites /70 tests, `/tmp/dadeto-y3se-focused.log`.
Cases cover each digit split0..4 for LF and CRLF, separately delivered CR/LF,
no writer launch/port reservation before completion, exact API URL4321, a split
writer port, malformed suffixes then a later valid9876 banner. All resources are
in-memory capabilities; native suites mock process launches. No actual Playwright,
production/provider requests or deployment.

`TMPDIR=/home/matt/.cache/dadeto-task-tmp/playwright-runner npm run
check:impact:run -- --files src/core/local/gcp-simulator/playwright-runner.js`:
PASS four suites /49 tests, zero source coverage gaps, ESLint/core-parse/zero clones.
`npm run check -- --skip-tests`: all11 local static gates PASS.
`npm run build`, `npm run build:cloud`, `npm run verify:cloud-packages`: PASS,
27 packages /713 modules /1,234 imports. Logs
`/tmp/dadeto-y3se-{impact,static,build,cloud-build,closure}.log`.
This is scoped/local evidence; authoritative full suite/coverage/E2E is CI.

Final entire-module mutation **PASS100%**, exit0: 111 detected,
98 Killed and 13 Timeouts, 5 static,
zero survivors/runtime errors/ignored/uncovered. Report matches current source
SHA-256 `1dac30860cf694ad77d4e50e633b1a02da9fb2b0aa48e84acd678527ad1afe02`. Timeouts remove required settlement, listener,
accumulation or matching progress, or change readiness digits/line terminators so
the valid banner no longer resolves. No timeout budget, skip or threshold changed;
this is not an all-Killed or zero-timeout claim. Retained
`reports/mutation/playwright-runner{,-summary}.json` and
`/tmp/dadeto-y3se-mutation.log`. Earlier capability receipts are preserved in
`reports/mutation/playwright-runner.pre-framing{,-summary}.json`.

Preceding capability child `dadeto-aaxq` is accepted at fcf3ddc by successful
Full Check40723133944 / artifact12831582742: 1,086 suites /8,396 tests,
all four global and runner coverage metrics100%, no files below thresholds.
The newer framing source requires its own exact pushed CI before closure.

## Next time

Readiness protocols carried over streams need explicit framing after variable-length
fields. Test chunk boundaries inside the field and before/inside its delimiter,
then assert that dependent startup has not happened yet. An ordinary newline-ended
happy path will not catch prefix acceptance.
