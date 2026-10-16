# CI test generated cloud artifact

- Unexpected hurdle: CI `npm run check` failed even though the non-test gates passed; `test/infra/cloudBrowserEntrypoints.test.js` tried to read generated `infra/admin.js` before any cloud build had run.
- Diagnosis: the test command runs before `test:e2e` invokes the browser build, and generated `infra/` outputs are intentionally absent from a clean checkout.
- Fix: assert the committed `src/browser/admin.js` contract and the source-to-target entry in `src/core/build/copy-cloud.js`; leave generated-output verification to the build workflow.
- Next time: when a test needs a generated package file, either build that artifact in the test harness or test the source and declared copy mapping without assuming another command ran first.
- Related discovery: THREEFOLD's nine-rung height conversion already exists in `src/core/browser/game/threefold/spatial.js`; check for existing game modules before adding new scale helpers.
