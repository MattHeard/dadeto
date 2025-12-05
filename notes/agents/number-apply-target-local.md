# Local target applier helper

- **Unexpected hurdle:** Capturing `createTargetApplier(textInput)` once required re-evaluating where to store the helper so the closure didn’t get rebuilt on every event.
- **Diagnosis & options considered:** By caching the returned function as `applyTargetToHandlers`, the event handler only supplies `targetValue` each time while the binding to `textInput` happens once.
- **What I learned:** Small caches inside factories are helpful when the same contextual data is reused across repeated calls; they keep the inner event logic lean.
- **Follow-ups/open questions:** None—lint continues to pass and behavior is intact.
