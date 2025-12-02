# Agent Retrospective – 2024-07-14 (Admin core document guard)

- **Surprise:** `resolveScopeDocument` triggered the complexity rule even though it had just a single `if (doc)` guard; splitting the check into `ensureDocumentAvailable` silenced the warning while keeping the error message intact.
- **Action:** `resolveScopeDocument` now delegates to `ensureDocumentAvailable`, so the entry point stays trivial and the guard logic lives in a dedicated helper.
- **Lesson:** When a helper only needs to guard one property, move the conditional into a named function so you can keep the outward-facing API as simple as possible.
- **Follow-up idea:** Apply the same guard-helper pattern to `resolveMatchMediaFunction` or the other `resolve` helpers still flagged by ESLint.
