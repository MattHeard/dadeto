Removed the default `context = {}` fallback from `createHandleVariantWrite` because the Cloud Functions entry point always provides a `context`, so the helper now assumes a caller-supplied object and lets missing contexts fail fast.

Unexpected hurdle: none—the Cloud Function wiring already passed a `context`, so this was a simplification.

Lesson: avoid unnecessary defaults when the runtime contract guarantees the dependency.

Open questions: none.
