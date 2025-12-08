## Unexpected insights
- The ESLint complexity rule that kept flagging `ensureTextareaInput` forced me to pull creation/sync logic into helpers so the exported function stayed simple. Splitting `getOrCreateTextarea` out kept the branching in one place and allowed `ensureTextareaInput` to rely on a single `if`, satisfying complexity while leaving the higher-level flow obvious.
- Changing the value sync back to a proper `if` (instead of the previous short-circuit expression) eliminated the `no-unused-expressions` warning while keeping the behavior identical.

## Follow-ups
- Keep an eye on this helper layout when future handlers reuse the same pattern; a shared “ensure special input” helper could centralize the branching even more safely.
