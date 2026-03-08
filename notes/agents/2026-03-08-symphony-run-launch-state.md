# 2026-03-08: symphony run launch state

- Bead: `dadeto-u210`
- Scope: move local Symphony from selected-bead status into one visible launched-run state without adding multi-run orchestration.
- Change:
  - added `applyRunnerLaunch()` in `src/core/local/symphony.js` so Symphony can transition a selected bead from `ready` to `running` with an `activeRun`
  - added `launchSelectedRunnerLoop()` in `src/local/symphony/launch.js` to stamp a run id, build the one-shot runner request, and persist the launched state
  - extended `src/local/symphony/statusStore.js` so `tracking/symphony/runs/` writes event-specific logs, including `launch` artifacts with `activeRun` details
  - added focused coverage in `test/core/local/symphony.launch.test.js` and `test/local/symphony.launch.test.js`
- Validation:
  - `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false test/core/local/symphony.launch.test.js test/local/symphony.launch.test.js` passed
  - `npm run lint` shows the new launch path without new Symphony lint warnings; the remaining Symphony warning is the pre-existing `summarizeTrackerSelection` complexity item
  - `npm test` passed with `470` suites and `2308` tests
- Follow-up:
  - the next Symphony slice can connect this launched-run state to an actual runner process or HTTP trigger, but this bead stops at visible single-run launch evidence
