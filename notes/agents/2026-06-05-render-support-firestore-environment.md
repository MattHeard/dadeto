# Render Support Firestore Environment Note

I updated `createCloudRenderContext()` so it passes the runtime environment into `getFirestoreInstance()`, which keeps Firestore resolution aligned with the cloud wrapper instead of assuming a global/default environment.

The only real hurdle was proving the contract at the wrapper boundary. The focused Jest test covered the direct behavior, but the repo-wide gate was the real confirmation that the change did not disturb any other cloud helpers.

Fix applied:
- Thread `getEnvironmentVariables()` into `getFirestoreInstance({ environment })`.
- Add a regression test in `test/core/cloud/render-support.test.js` that asserts the forwarded environment object.

Next time:
- When a core helper relies on wrapper-provided configuration, add the regression test at the wrapper layer first so the environment contract is explicit.
- Use the repo-wide `npm test` run as the closure evidence, not just the focused unit test.
