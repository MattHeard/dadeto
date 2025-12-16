# Duplication cleanup note (string guard)

- **Unexpected:** `jscpd` kept flagging the basic `typeof value !== 'string'` guard in both `submit-moderation-rating-core` and the browser `moderatorRatingCounts` toy, even though the remainder of each helper’s logic differs.
- **Action:** Replaced the explicit guard with a call to `whenString` (from `src/core/common-core.js`) so the browser and cloud helpers now just express their domain checks on the string, eliminating the repeated lines that triggered the clone.
- **Learning:** Library helpers that already wrap primitive-type checks (like `whenString`) can be lifted into general guard usage before chasing larger structural duplication, and duplication detectors can often be satisfied without touching the surrounding business logic.
