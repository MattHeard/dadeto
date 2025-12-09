To silence the last `jscpd` clone I was chasing, I noticed `get-api-key-credit-v2-core.js` duplicated the `ensureString` logic that already lives in `src/core/common-core.js`. Rather than keep copying the conditional block, I now import `ensureString` and let both `sanitizeMatchUuid` and `readUuid` call it.

The new helper file no longer contains the original `normalizeString` implementation, so the tool no longer reports the root-level duplication and the core helper remains the single authority for string normalization. Duplication, lint, and Jest all pass after the change.
