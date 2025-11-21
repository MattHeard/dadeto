# Story ID resolution helper split

- While lint still flagged the `resolveStoryId` method, pulling the candidate-selection logic into `resolvePreferredStoryIdentifier` and returning `randomUUID()` only when that helper returned nothing let me shrink the conditional surface and keep the original decision flow intact.
- Switching the final `return` to an explicit `if (candidate)` guard (instead of `??`) keeps the function’s complexity below the limit and still falls back to `randomUUID`.
- Lesson: a tiny helper with a single `if` can make the caller trivial enough that ESLint stops warning about the previous multi-branch implementation.

Open questions:
- Should future iterations try to reduce the remaining complexity warnings in `process-new-story-core.js` (field assertions, queueing logic) using a similar helper-based breakdown?
