Removed the empty-check guard from `resolveStoryMetadata` now that we trust the `rootVariant` lookup to always yield documents; the helper now directly constructs `firstPageUrl` without conditional branches so invalid metadata fails fast.

Unexpected hurdle: none—the cloud assumption held and existing tests still pass.

Lesson: eliminating unreachable branches keeps the helper concise and surfaces Firestore anomalies immediately.

Open questions: none.
