## Summary
- Extracted a helper to detect custom Firestore dependency overrides in the assign moderation job
- Ensured the new helper is exposed through testing utilities after updating the Firestore factory
- Confirmed the refactor with the full Jest suite

## Challenges
- Preserving the previous dependency detection semantics required checking the raw options before defaults were applied; using the original options object maintained the prior behavior when callers omitted overrides.
