# 2026-03-08: symphony launch trigger

- Bead: `dadeto-cc6z`
- Scope: expose one operator-facing trigger that launches exactly one Ralph loop through the existing Symphony single-run launch path.
- Change:
  - added a single bounded trigger surface at `POST /api/symphony/launch` in `src/local/symphony/app.js`
  - factored the local app route logic into exported status and launch handlers so the trigger stays testable without opening sockets
  - wired the local server in `src/local/symphony/server.js` to pass `launchSelectedRunnerLoop()` into the app instead of inventing a separate execution path
  - added focused trigger coverage in `test/local/symphony.app.test.js` for the ready launch case and the missing-launch-config case
- Validation:
  - `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false test/local/symphony.app.test.js test/local/symphony.launch.test.js test/local/symphony.launcherCodex.test.js test/core/local/symphony.launch.test.js test/core/local/symphony.launch-invocation.test.js` passed
  - `npm run lint` shows no new Symphony warning from the trigger slice; the remaining Symphony warning is the pre-existing `summarizeTrackerSelection` complexity item
  - `npm test` passed with `472` suites and `2314` tests
- Follow-up:
  - this bead stops at one local trigger surface; a later slice can add operator affordances around it without widening into a full control plane
