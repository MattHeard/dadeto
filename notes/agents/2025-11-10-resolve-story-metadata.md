Removed the defensive fallback that coerced missing story data into an empty object inside `resolveStoryMetadata`, now relying on the invariant that the story snapshot always provides valid data and letting missing fields bubble naturally.

Unexpected hurdle: none—the simple assumption change didn't impact existing tests once the helper ran with real snapshots.

Lesson: when guards guard impossible states, they can obscure real bugs by masking them; tightening assumptions keeps runtime errors localised and easier to trace.

Open questions: should a shared assertion guard the Firestore invariants upstream so downstream helpers like this stay minimal?
