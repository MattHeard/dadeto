Updated `buildParentRoute` to assume Firestore snapshot data always exists, removing the `|| {}` fallbacks and winging every access directly. The helper now fails fast when the upstream data contract is violated instead of masking it.

Unexpected hurdle: none—the helper already received real data from the caller, so the change was purely stylistic.

Lesson: redundant guard clauses around impossible data blur the signal; trusting Firestore invariants keeps helpers lean.

Open questions: none.
