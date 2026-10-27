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
