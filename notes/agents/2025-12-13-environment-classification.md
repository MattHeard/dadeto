## Environment Classification Helper

- **Surprise**: jscpd kept flagging the `'test'`/`'prod'` classification inside multiple cloud modules, so sharing the logic via a new helper was needed to prevent the duplication from reappearing.
- **Diagnosis & fix**: Added `classifyDeploymentEnvironment` (plus small helpers) to `cloud-core` and reworked `mark-variant-dirty`, `get-moderation-variant`, and `assign-moderation-job` to import it. `assign-moderation-job` now chooses origins via a resolver map rather than branching, and `mark-variant-dirty` uses `ensureString` for `variantName`, so the repeated guards are gone.
- **Follow-up**: Ran `npm run duplication`, `npm run lint`, and `npm test`; tooling passes with the new helper, while the remaining clones are unrelated (cyberpunk adventure, API key vs mark-variant). Keep scanning the duplication report for the next easy group.
