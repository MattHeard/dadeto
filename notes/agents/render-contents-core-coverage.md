# Render contents core coverage

- Unexpected hurdle: the stale inventory understated the final gap; the focused report isolated one default-visibility fallback.
- Diagnosis: a variant document without a `visibility` field was not represented in the existing story-fetch fixtures.
- Fix: added a genuine integration-style fixture proving missing visibility defaults to visible.
- Next time: include absent optional Firestore fields alongside explicit visible and hidden fixtures.
