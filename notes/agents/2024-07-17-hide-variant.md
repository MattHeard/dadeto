# Agent Retrospective – 2024-07-17 (Hide Variant HTML)

- **Surprise:** The `hasParentWithGrandparent` helper was still flagged by complexity despite being a one-liner; ESLint counted the chained optional access as additional branches.
- **Action:** Extracted the conditional into `hasGrandparent`, so `hasParentWithGrandparent` now simply reads the parent reference and defers the guard. That keeps the branching logic in one place while letting the top-level helper stay under the limit.
- **Lesson:** When optional chaining trips complexity, move each guard into its own helper even if the logic is trivial—the main helper can then remain just a single function call.
