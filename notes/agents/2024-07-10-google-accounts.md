# Agent Retrospective – 2024-07-10 (Admin core Google Accounts)

- **Surprise:** The `resolveGoogleAccountsId` helper triggered the complexity rule despite only checking for `google.accounts` before returning an ID—ESLint treats each `if` as increasing cyclomatic complexity, so the helper kept failing.
- **Action:** Pulled the guard logic into a new `getGoogleAccountsIdFromWindow` function, leaving `resolveGoogleAccountsId` as a single-call wrapper that simply surfaces the cached window reference.
- **Lesson:** When a function’s branching stems from guarding a dependency lookup, wrap the guard in a dedicated helper so the public entry point stays trivial without duplicating validation logic.
- **Follow-up idea:** Reuse `getGoogleAccountsIdFromWindow` in other admin helpers that read `google.accounts` to keep guard logic centralized and complexity complaints suppressed.
