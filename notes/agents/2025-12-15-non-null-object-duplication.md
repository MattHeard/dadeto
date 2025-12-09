## Shared non-null object guard

- **Unexpected:** The latest duplication run kept flagging `isNonNullObject` (and the adjacent error-message helpers) across `browser-core`, `generate-stats`, and `submit-moderation-rating`. Each module had its own copy, so the same nine-line guard showed up repeatedly despite being trivial.
- **Diagnosis:** A single good implementation lives inside `common-core`, so I moved the guard there and re-exported it through `browser-core` so the public API stayed intact. After that, `generate-stats` and `submit-moderation-rating` just import the shared helper instead of redeclaring it. While there, I also extracted `resolveErrorMessage` inside `generate-stats` so both `getLogMessage` and `getGenerateErrorMessage` use the same branching logic instead of duplicating the `if (isErrorWithMessage)` block.
- **Next steps:** The duplication report still lists toy-specific parser helpers and presenter snippets, so similar helper extraction (e.g., for the `toys-core` CSV parser or the `battleshipSolitaireClues` helper) would be the natural follow-up.

**Testing**
1. `npm run duplication`
2. `npm run lint`
3. `npm test`
