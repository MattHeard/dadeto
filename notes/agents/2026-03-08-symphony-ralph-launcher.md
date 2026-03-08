# 2026-03-08: symphony ralph launcher invocation

- Bead: `dadeto-0fzi`
- Scope: replace Symphony's launch-intent-only path with one real Ralph launcher invocation attempt, while keeping the slice single-run and local-first.
- Change:
  - added launcher config defaults in `src/local/symphony/config.js` and surfaced that config through `src/local/symphony/bootstrap.js`
  - added `src/local/symphony/launcherCodex.js` to start a detached `codex exec` session with a minimal Ralph prompt contract containing `you are ralph`, `pop <beadId>`, and the run id
  - updated `src/local/symphony/launch.js` so Symphony now calls a launcher seam, records `activeRun` and launcher metadata on success, and records a blocked `lastLaunchAttempt` plus `launch-failed` artifact on failure
  - extended `src/core/local/symphony.js` and `src/local/symphony/statusStore.js` so status/run artifacts distinguish successful invocation from failed launch attempts
  - added focused coverage in `test/core/local/symphony.launch-invocation.test.js`, `test/local/symphony.launch.test.js`, and `test/local/symphony.launcherCodex.test.js`
- Validation:
  - `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false test/core/local/symphony.launch.test.js test/core/local/symphony.launch-invocation.test.js test/local/symphony.launch.test.js test/local/symphony.launcherCodex.test.js` passed
  - `npm run lint` shows no new Symphony warnings from the invocation slice; the remaining Symphony warning is the pre-existing `summarizeTrackerSelection` complexity item
  - `npm test` passed with `472` suites and `2312` tests
- Follow-up:
  - this bead stops at launch attempt and artifact recording; a later slice can wire outcome collection back from the spawned Ralph session
