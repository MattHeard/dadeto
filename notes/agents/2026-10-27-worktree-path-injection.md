# Worktree runner path injection

Bead: `dadeto-1bl2`; parent `dadeto-e1oz`; Rank11 remains Active / Partial.

## Diagnosis and bounded change

The original runner/target tasks dadeto-d6ab and dadeto-jxv5 were already
implemented. Current source/CLI and three focused suites / 12 tests verify
worktree lifecycle, target normalization, resource settings, report copying and
BEADS_NO_DAEMON. Source/test blobs are unchanged since the successful full
check40588740109; close those stale original scopes rather than rewrite them.

The remaining pure-path defect is machine logging bypassing the existing
pathModule with a direct node:path dirname call. Require the precise five-method
path bundle at the factory boundary; the local wrapper supplies its existing
native path import. Bind logging/command helpers within the factory so every
log uses that bundle. Configured callers must provide it; absence is a
programming error. Keep filesystem/spawn/environment/timestamp defaults as
explicit remaining portability work; this does not make the module pure.

All four new non-native-path regressions fail before the fix and pass after it:
every log parent uses the supplied dirname, failures propagate before logging
or spawning, two instances keep separate path bundles, and missing paths fail.
Existing integration fixtures explicitly provide native path. Four suites / 16
tests, targeted ESLint/checkJs and scoped source coverage pass; no uncovered
lines/branches and zero clones. Remove only this module's blanket mutation skip;
no global source/mutation exclusion or threshold change is introduced.

## Safe mutation harness and first result

Mutation can force spawnImpl's native fallback even when a test supplies a fake.
Block node:child_process before dynamic core import in all three non-default
suites; the defaults suite already mocks it. The independent path test uses only
fake filesystem/process operations. Existing integration fixtures use temporary
test files and fake processes. No actual mutation-worktree command is needed.

The pre-isolation experiment was intentionally interrupted and is not acceptance
evidence. Stryker changes its process title, so a ps-argument check refused the
first signal attempt. Verify the exact PID's node executable, workspace and
stdout log descriptor before sending SIGINT; do not broadly kill Node processes.
The verified old session exited130. Keep its log separately.

The complete isolated baseline fails at74.03%: 110Killed,40Survived,4Timeout,
154mutants,0static. Retained report: reports/mutation/worktree-runner.initial.json;
log /tmp/dadeto-1bl2-mutation-isolated.log. The 100% threshold stays intact.
Exact lifecycle/config/error cases and test-only Promise completion bounds are
the next evaluator improvement; remove only proven internal redundancy.

```sh
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --coverage=false test/core/scripts/run-stryker-worktree-core.test.js test/core/scripts/run-stryker-worktree-core.coverage.additional.test.js test/core/scripts/run-stryker-worktree-core.defaults.test.js test/core/scripts/run-stryker-worktree-core.paths.test.js
npm run check:impact:run -- --files src/core/scripts/run-stryker-worktree-core.js
npm run check -- --skip-tests
npm run build
node node_modules/@stryker-mutator/core/bin/stryker.js run docs/quality/worktree-runner.stryker.config.mjs
```

Next time: test non-native injected paths at the log boundary; native-only
fixtures conceal bypasses. Guard native process fallbacks before mutation runs.
A full-coverage pass alone does not establish mutation confidence. Record exact
pushed FullCheck separately before closure. Remaining fs/spawn/env/timestamp
coupling and the broader namespace migration remain open under the parent.

## Mutation-driven test hardening

The isolated 154-mutant baseline identifies missing exact fresh/reused lifecycle
traces, temp/report roots, filesystem option mappings, configuration validity and
error strings. Add complete fake-process call/argument/environment assertions;
configuration cases cover absent/minimum/valid/zero/negative/fractional/invalid/
empty/infinite/exponent inputs and exact generated text. Fixture mocks are cleared
per test so prior calls cannot satisfy later assertions.

The four hanging mutants delete a Promise executor, exit callback, exit event or
error settlement. A shared test-only completion helper races controlled runner
operations against a2s failure and always clears its timer; runtime and Stryker
budgets stay unchanged. All native process fallbacks remain blocked in tests.
This turns missing settlement into an explicit test failure before the mutation
engine timeout, without suppressing any mutant.

Remove only the internal cleanup call's allowFailure:true: its outer catch already
consumes the command rejection. Synchronous spawn errors, emitted errors and
nonzero cleanup exits still finish cleanup. Keep all externally supplied
filesystem options and lifecycle mappings intact. The exported runCommand
allowFailure contract remains covered independently.

Four focused suites / 36 tests, scoped source coverage without uncovered lines
or branches, all ten split static gates and build pass. Logs:
`/tmp/dadeto-1bl2-hardening-{focused,impact,static,build,mutation}.log`.
The unchanged100% whole-module mutation rerun is still live; inspect its terminal
report before claiming acceptance. Initial path slice ae033c7 is pushed, with
exact FullCheck40595672238 tracked separately from the final hardening commit.

## Final acceptance evidence — 27 October 2026

The full-module mutation gate passes at100%: **153/153 detected**, comprising
149 Killed and4 Timeout classifications, no survivors/ignored/uncovered mutants.
Static evaluation is enabled; no static mutants are generated in this module.
The four timeout replacements remove the Promise executor, exit handler, exit
event name or error settlement. They leave operations pending; per-operation
checks fail, and several such failures can accumulate before the mutation
engine finishes a run. These are recorded as detected non-settlement, not as
149+4 failed assertions or an all-Killed result. No timeout budget was increased.

Report `reports/mutation/worktree-runner.json` and summary
`reports/mutation/worktree-runner-summary.json` match the exact runtime source;
SHA-256 `016e21230505a9b2894bde8d1a27eebf355ee22bf66714c871f9b1fb47663a85`.
The final engine exited0, with no mutation/source exclusion or threshold change.
Log: `/tmp/dadeto-1bl2-hardening-mutation.log`.

Exact hardening [FullCheck40596717662](https://github.com/MattHeard/dadeto/actions/runs/40596717662)
succeeded at8dd3fba3d9b3b968f1a620e0c736e0d927010372. Downloaded artifact
`full-check-40596717662` (12777556488), report
`/tmp/dadeto-full-check-40596717662/coverage/check-full-report.md`, confirms
1,068 suites / 8,253 tests passed; all four global coverage metrics and the
changed runner's four metrics are100%. Injection FullCheck40595672238 also
succeeded. Focused36tests, scoped source coverage without gaps, all10split
local static gates and build pass. Runtime source/test blobs remain unchanged
for this receipt. Remaining direct built-ins:9modules/20imports; fs/spawn/env/time
portability and the broader migration remain open. Rank11 staysActive/Partial.
