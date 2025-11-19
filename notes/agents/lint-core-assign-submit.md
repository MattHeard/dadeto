Removed dozens of `src/core` warnings by cleaning up JSDoc blocks in the moderation helpers so the rules no longer emit phantom `root0` messages.

- `assign-moderation-job-core.js`: rewrote the doc blocks for the dependency-detection helpers, `createCorsOriginHandler`, `selectVariantDoc`, and the guard chain utilities so the JSDoc sits directly in front of each function and references the actual parameter names (no more stray `root0`). That eliminated the bulk of the prior `jsdoc/require-*` noise without touching the core logic.
- `submit-moderation-rating-core.js`: completed the same doc cleanup for header parsing, CORS configuration, assignment resolution, response validation, and moderator-context helpers. The file now keeps a single, descriptive doc block per function and the missing `@param`/`@returns` warnings disappeared, leaving only the complexity rules to investigate later.
- Ran `npm run lint` and `npm test` after the refactor; the warnings drop from 265 to 206 and the suite still reports 100% coverage, so the doc reshuffle had zero behavioral impact.

Open questions / follow-ups:
1. Should we eventually split the remaining high-complexity helpers (`shouldUseCustomFirestoreDependencies`, `submitModerationRatingResponder`, etc.) into smaller guards so the `complexity` rule is no longer the blocker?  
2. Would enforcing adjacent JSDoc comments via a lint helper or editor template prevent future regressions where empty blocks sit between doc and function?
