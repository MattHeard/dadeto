# Centralized String Helpers

Duplication persisted between `textAppendList`, `hide-variant-html`, and `cloud-core` because they each defined the same nullish/string-coercion helpers. Instead of keeping them in a dedicated `value-utils.js`, I moved those helpers into `common-core.js`, exporting `isNullish`, `normalizeNonStringValue`, and `ensureString` immediately and pointing the toys and hide-variant module at the shared implementation. Removing the standalone file simplifies the module graph and keeps the shared helpers next to other validation utilities that already live in `common-core`.

`npm run lint`, `npm test`, and `npm run duplication` still pass after the refactor; the only remaining clone at `minTokens=40` now comes from the tic-tac-toe vs. calculateVisibility JSON parsing pair.

Open questions:
- Can we handle the `data:text/javascript` mutant tests before sharing the JSON parser from `jsonUtils` so the tic-tac-toe duplication can be eliminated?
