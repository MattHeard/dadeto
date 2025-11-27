# Complexity refactor note (2025-11-27)

- Unexpected hurdle: the strict `complexity` rule reacts even to optional chaining, so the remaining warnings were not obvious until I reran `npx eslint` with `complexity:[warn,2]` and parsed the JSON output. That forced me to try small, surgical refactors first instead of a broad change.
- What I did: normalized `buildVariantObject` via destructuring (no optional chains), and moved the CDN invalidation loop into an `executeInvalidation` helper so the factory keeps only a guard and the call; this earned back a complexity warning even though several other helpers still exceed the limit.
- Lessons/next steps: the remaining warnings cluster around cache invalidation (`createInvalidatePathsImpl`), parent lookups, and render entry helpers, so a future agent could continue splitting those high-visibility functions into smaller pieces or find ways to reduce `||`/`?.` usage for this rule.
- Testing note: I reran `npx eslint src/core/cloud/render-variant/render-variant-core.js --rule 'complexity:[warn,2]' --format json` after the refactors to confirm the modified functions no longer emit the targeted warnings.
