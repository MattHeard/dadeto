Removed the defensive `|| {}` fallbacks inside `handleVariantWrite` and now assume both `change.after.data()` and `change.before.data()` always return real objects, so visibility comparisons read the supplied fields directly and contract violations blow up immediately.

Unexpected hurdle: none—the handler was only ever invoked with real snapshots, so this simplification merely declutters the logic.

Lesson: redundant defaults around Firestore snapshots hide problems; trusting the SDK invariants keeps change handlers lean and transparent.

Open questions: none.
