Story landing page alias removal

Unexpected hurdle:
- A fix for the GCP E2E failure had added a `story/<storyId>.html` write inside the render-variant path.

Diagnosis:
- That write was an implementation shortcut for the failing redirect target, but it did not match the intended publish model.
- The associated unit test also locked in the shortcut by asserting the bucket write directly.

Chosen fix:
- Removed the `story/<storyId>.html` write from `render-variant-core.js`.
- Removed the regression test that existed only to support that alias.

Next-time guidance:
- When a cloud redirect fails, prefer tracing the actual publish pipeline and storage contract before adding a new object path as a workaround.
