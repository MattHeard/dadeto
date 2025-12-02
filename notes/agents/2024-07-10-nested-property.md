# Agent Retrospective – 2024-07-10 (Admin core)

- **Surprise:** The `getNestedProperty` reduce callback triggered the complexity rule because it contained an inline `&&` guard; the warning reappeared even though the logic seemed trivial.
- **Action:** Extracted the guard into `isTraversable` and the property access into `resolveNestedProperty`, leaving the reducer with a single call — now the arrow function is complexity-compliant and the auxiliary helpers each have a clear, single-return flow.
- **Lesson:** Splitting even simple `&&` checks into helpers can tame cyclomatic complexity while keeping the intent readable for future agents.
- **Follow-up idea:** When the same nested-access pattern appears elsewhere, reuse `resolveNestedProperty` or the guard to keep other cursors lint-friendly.
