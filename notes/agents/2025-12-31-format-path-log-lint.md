# 2025-12-31 Format path log lint

- **Challenge:** The `formatPathForLog` helper in `src/core/cloud/copy.js` triggered the complexity rule because it used two separate conditional returns. I needed to refactor without adding ternaries, which are also disallowed by lint.
- **Resolution:** Collapsed the dual branching into a single lookup map keyed by the `startsWith('..')` check. This preserved readability, respected the no-ternary rule, and dropped the complexity count below the threshold.
