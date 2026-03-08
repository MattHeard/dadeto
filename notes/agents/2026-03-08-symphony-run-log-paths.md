# 2026-03-08: symphony run log paths

- Bead: `dadeto-36hl`
- Scope: improve operator visibility for one Symphony-launched Ralph run by persisting append-only stdout/stderr artifacts without expanding into process supervision.
- Change:
  - updated `src/local/symphony/launcherCodex.js` to create per-run `stdout` and `stderr` log files under `tracking/symphony/runs/` before spawning `codex exec`
  - switched the detached launcher from `stdio: 'ignore'` to file-backed descriptors so early launch output survives after the child detaches
  - threaded `stdoutPath` and `stderrPath` through `src/local/symphony/launch.js` into the existing `activeRun` and `lastLaunchAttempt` metadata in `src/core/local/symphony.js`
  - kept the status-store shape stable while making the existing `launch.log` artifact point operators at the new per-run log files
  - extended focused tests in `test/local/symphony.launcherCodex.test.js`, `test/local/symphony.launch.test.js`, and `test/core/local/symphony.launch-invocation.test.js`
- Validation:
  - `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false test/local/symphony.launcherCodex.test.js test/local/symphony.launch.test.js test/core/local/symphony.launch.test.js test/core/local/symphony.launch-invocation.test.js` passed
  - `npm test` passed
- Follow-up:
  - Symphony still needs a later slice to reconcile child-process exit or bead outcome back into scheduler state; this bead only improves the local evidence operators can inspect after launch
