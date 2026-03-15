# 2026-03-15: Verify Symphony fd cleanup warning

- **Unexpected hurdle:** Hard to reproduce the warning because the sandboxed Symphony server can’t bind its usual port, so I had to rely on existing logs/tests instead of watching a live `codex exec` run.
- **Diagnosis path:** Read `notes/agents/2026-03-13-symphony-fd-gc.md`, inspected `src/local/symphony/launcherCodex.js` (open/run log handle plumbing) and `test/local/symphony.launcherCodex.test.js`, and reran `npm test -- test/local/symphony.runner-exit.test.js test/local/symphony.launcherCodex.test.js` while grepping the generated logs for any lingering fd warnings.
- **Chosen fix:** No new code change—`openRunLogFiles` now closes both `FileHandle`s in `closeRunLogHandles` after the spawn, and the launcher test asserts the closes happen, so the fd-cleanup warning no longer reproduces in the scoped evaluator.
- **Next-time guidance:** If the warning shows up again during a real launch, grab the exact warning text from the run’s `stderr` log under `tracking/symphony/runs/`, confirm that every `FileHandle` returned by `open` is closed, and rerun the targeted tests to assert no new handles leak.
