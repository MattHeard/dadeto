# Duplication helper extractions

- The smallest clones at `minTokens: 23` were driven by identical guard/fallback logic, e.g. returning the resolved error message vs. a fallback string in `get-moderation-variant` and `mark-variant-dirty`. I centralized the “message-or-default” logic in `cloud-core.resolveMessageOrDefault` so both endpoints can share the helper and avoid re-implementing the same pattern.
- After the helper landed, I simplified `getInvalidTokenMessage` to call it directly instead of keeping a local `selectInvalidTokenMessage`, and the update handler now returns `resolveMessageOrDefault(message, 'update failed')`. That broke the duplicate snippet while keeping the normalized message handling intact.
- This approach leaves the other clones (e.g., new-page vs. new-story boots and the `copy` helpers) for future refactors; the helper addition shows the pattern we can apply once we decide which cross-file duplication is worth untangling.

Open questions / follow-ups:
- Should we also re-apply `resolveMessageOrDefault` for other endpoints that guard on `message` vs. fallback? If we do, we may be able to raise `minTokens` again later.
